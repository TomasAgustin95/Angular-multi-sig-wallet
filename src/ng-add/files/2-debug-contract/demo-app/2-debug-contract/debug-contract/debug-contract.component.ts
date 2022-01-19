import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ComponentFactoryResolver,
  ElementRef,
  OnInit,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';

import DebugContractMetadata from '../../../../../assets/contracts/debug_contract_metadata.json';
import { ContractInputComponent } from '../contract-input/contract-input.component';

import { ethers } from 'ethers';
import {
  BlockWithTransactions,
  convertEtherToWei,
  convertUSDtoEther,
  convertWeiToEther,
  DialogService,
  displayEther,
  displayUsd,
  IABI_OBJECT,
  IBALANCE,
  ICONTRACT,
  IINPUT_EVENT,
  NotifierService,
} from 'angularonchain';
import { OnChainService } from '../on-chain.service';

@Component({
  selector: 'debug-contract',
  templateUrl: './debug-contract.component.html',
  styleUrls: ['./debug-contract.component.css'],
})
export class DebugContractComponent implements AfterViewInit {
  blocks: Array<BlockWithTransactions> = [];
  contract_abi: Array<IABI_OBJECT>;
  walletBalance: IBALANCE;
  contractBalance: IBALANCE;
  contractHeader: ICONTRACT;
  deployer_address;

  myContract: ethers.Contract;
  greeting: string;
  greeting_input: string;
  provider: ethers.providers.JsonRpcProvider;
  signer: any;
  deployer_balance: any;
  loading_contract: 'loading' | 'found' | 'error' = 'loading';
  componentInstances: Array<ContractInputComponent> = [];
  stateInstances: Array<ContractInputComponent> = [];
  events = [];
  eventsAbiArray = [];

  blockchain_is_busy = true;

  newWallet: ethers.Wallet;

  dollarExchange: number;
  balanceDollar: number;
  constructor(
    private dialogService: DialogService,
    private notifierService: NotifierService,
    private onChainService: OnChainService,

    private componentFactoryResolver: ComponentFactoryResolver
  ) {
    this.contract_abi = DebugContractMetadata.abi;
    console.log(this.contract_abi);
  }

  @ViewChild('inputContainer', { read: ViewContainerRef })
  inputContainer: ViewContainerRef;

  @ViewChild('stateContainer', { read: ViewContainerRef })
  stateContainer: ViewContainerRef;

  @ViewChild('payableContainer', { read: ViewContainerRef })
  payableContainer: ViewContainerRef;

  add(abi: IABI_OBJECT): void {
    // create the compoxnent factory
    const dynamicComponentFactory =
      this.componentFactoryResolver.resolveComponentFactory(
        ContractInputComponent
      );

    let componentRef;
    // add the component to the view

    if (
      abi.stateMutability == 'view' &&
      abi.inputs.length == 0 &&
      abi.outputs.length == 1
    ) {
      componentRef = this.stateContainer.createComponent(
        dynamicComponentFactory
      );
      this.stateInstances.push(componentRef.instance);
    } else if (abi.stateMutability == 'payable') {
      componentRef = this.payableContainer.createComponent(
        dynamicComponentFactory
      );
    } else {
      componentRef = this.inputContainer.createComponent(
        dynamicComponentFactory
      );
    }
    componentRef.instance.initUi(abi);
    this.componentInstances.push(componentRef.instance);

    componentRef.instance.newEventFunction.subscribe(
      async (value: IINPUT_EVENT) => {
        const myResult = await this.onChainService.contractService.runFunction(
          value.function,
          value.args,
          value.state
        );
        console.log(myResult);
        if (myResult.msg.success == false) {
          await this.notifierService.showNotificationTransaction(myResult.msg);
        }

        if (myResult.msg.success_result !== undefined) {
          await this.notifierService.showNotificationTransaction(myResult.msg);
        }

        if (value.function !== 'pure' && value.function !== 'view') {
          this.updateState();
        }

        if (value.outputs.length > 0) {
          if (myResult.msg.success == true) {
            componentRef.instance.refreshUi(myResult.payload);
          } else {
            await this.notifierService.showNotificationTransaction(
              myResult.msg
            );
          }
        }
      }
    );
  }

  async updateState() {
    for (const stateCompo of this.stateInstances) {
      const result =
        await this.onChainService.contractService.runContractFunction(
          stateCompo.abi_input.name,
          {}
        );

      if (result.msg.success == true) {
        stateCompo.refreshUi(result.payload);
      } else {
        this.notifierService.showNotificationTransaction(result.msg);
      }
    }
  }

  async onChainStuff() {
    try {
      await this.onChainService.init();

      this.deployer_address =
        await this.onChainService.localProvider.Signer.getAddress();

      this.onChainService.localProvider.blockEventSubscription.subscribe(
        async (blockNr) => {
          this.onChainService.contractService.refreshBalance();
          this.onChainService.walletService.refreshWalletBalance();
          this.blockchain_is_busy = false;
          const block =
            await this.onChainService.localProvider.Provider.getBlockWithTransactions(
              blockNr
            );
          this.blocks = [block].concat(this.blocks);
        }
      );

      this.newWallet = await this.onChainService.walletService.wallet;
      this.myContract = this.onChainService.contractService.Contract;

      this.onChainService.contractService.contractBalanceSubscription.subscribe(
        async (balance) => {
          const ehterbalance = convertWeiToEther(balance);
          const dollar =
            ehterbalance * (await this.onChainService.getDollarEther());
          this.contractBalance = {
            ether: displayEther(ehterbalance),
            usd: displayUsd(dollar),
          };
        }
      );

      this.onChainService.walletService.walletBalanceSubscription.subscribe(
        async (balance) => {
          const ehterbalance = convertWeiToEther(balance);
          const dollar =
            ehterbalance * (await this.onChainService.getDollarEther());
          this.walletBalance = {
            ether: displayEther(ehterbalance),
            usd: displayUsd(dollar),
          };
        }
      );

      this.contractHeader = {
        name: this.onChainService.contractService.metadata.name,
        address: this.onChainService.contractService.metadata.address,
      };

      this.eventsAbiArray = this.contract_abi.filter(
        (fil) => fil.type == 'event'
      );

      this.eventsAbiArray.forEach((val) => {
        this.myContract.on(val.name, (args) => {
          let payload;
          if (typeof args == 'object') {
            payload = JSON.stringify(args);
          } else {
            payload = args.toString();
          }

          this.events.unshift({
            name: val.name,
            payload,
            timeStamp: new Date().toLocaleTimeString(),
          });
        });
      });

      this.contract_abi
        .filter((fil) => fil.type !== 'constructor')
        .filter((fil) => fil.type !== 'event')
        .filter((fil) => fil.type !== 'receive')
        .forEach((abi) => {
          this.add(abi);
        });

      this.updateState();
    } catch (error) {
      this.loading_contract = 'error';
    }
  }

  async addBlock(blockNr) {
    const block =
      await this.onChainService.localProvider.Provider.getBlockWithTransactions(
        blockNr
      );
    this.blocks = this.blocks.concat(block);
  }

  async doFaucet() {
    this.blockchain_is_busy = true;
    let amountInEther = '0.01';
    // Create a transaction object
    let tx = {
      to: this.newWallet.address,
      // Convert currency unit from ether to wei
      value: ethers.utils.parseEther(amountInEther),
    };
    // Send a transaction
    const transaction_result =
      await this.onChainService.localProvider.doTransaction(tx);
    this.blockchain_is_busy = false;
    await this.notifierService.showNotificationTransaction(transaction_result);
  }

  async openTransaction() {
    this.blockchain_is_busy = true;
    const res = await this.dialogService.openDialog();

    if (res && res.type == 'transaction') {
      const usd = res.amount;
      const amountInEther = convertUSDtoEther(
        res.amount,
        await this.onChainService.getDollarEther()
      );
      const amountinWei = convertEtherToWei(amountInEther);

      let tx = {
        to: res.to,
        // Convert currency unit from ether to wei
        value: amountinWei,
      };

      const transaction_result =
        await this.onChainService.walletService.doTransaction(tx);
      this.blockchain_is_busy = false;
      await this.notifierService.showNotificationTransaction(
        transaction_result
      );
    } else {
    this.blockchain_is_busy = false;
    }
  }

  ngAfterViewInit(): void {
    this.onChainStuff();
  }
}
