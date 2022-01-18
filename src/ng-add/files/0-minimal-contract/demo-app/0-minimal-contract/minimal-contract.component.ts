import { Component, OnInit } from '@angular/core';
import { Contract, Wallet } from 'ethers';
import { OnChainService } from './on-chain.service';

@Component({
  selector: 'minimal-contract',
  template: `<div style="text-align:center" *ngIf="!!contractHeader" ><p> Wallet created: {{myWallet?.address}}</p>
  <p>{{contractHeader.name}} <br>deployed to {{contractHeader.address}} <br>by: {{deployer_address}}</p>
  </div>`,
  styles: [
  ]
})
export class MinimalContractComponent implements OnInit {
  deployer_address: string;
  myWallet: Wallet;
  myContract: Contract;
  contractHeader: { name: string; address: string; };

  constructor(private onChainService:OnChainService) { }

  async onChainStuff(){
    await   this.onChainService.init()

    this.deployer_address =
      await this.onChainService.localProvider.Signer.getAddress();

      this.myWallet = await this.onChainService.myWallet.wallet;
      this.myContract = this.onChainService.minimalContract.Contract;

      this.contractHeader = {
        name: this.onChainService.minimalContract.metadata.name,
        address: this.onChainService.minimalContract.metadata.address,
      };

  }

  ngOnInit(): void {
    this.onChainStuff()
  }

}
