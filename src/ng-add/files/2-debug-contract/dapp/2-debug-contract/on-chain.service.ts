import { Inject, Injectable } from '@angular/core';
import { AngularContract, AngularNetworkProvider,AngularWallet,ICONTRACT  } from 'angular-web3';
import { Contract} from 'ethers'
import { uniswap_abi } from './uniswap_abi';


@Injectable({
  providedIn: 'root'
})
export class OnChainService {
  private _dollarExchange!: number;
  myProvider!: AngularNetworkProvider;
  newWallet!: AngularWallet;
  debugContract!: AngularContract;
  constructor( @Inject('debugContractMetadata') public debugContractMetadata:ICONTRACT
  ) { }


  async getDollarEther() {
    if (this._dollarExchange == undefined) {

    const uniswapUsdcAddress = "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc";
    const uniswapAbi = uniswap_abi;
    
   const uniswapService = new AngularNetworkProvider([
    "https://eth-mainnet.gateway.pokt.network/v1/lb/611156b4a585a20035148406",
    `https://eth-mainnet.alchemyapi.io/v2/oKxs-03sij-U_N0iOlrSsZFr29-IqbuF`,
    "https://rpc.scaffoldeth.io:48544",
  ])

   await uniswapService.init()

  const getUniswapContract = async (address:string) =>
    await new Contract(address, uniswapAbi, uniswapService.Provider);
    const contract = await getUniswapContract(uniswapUsdcAddress);
    const reserves = await contract['getReserves']();

    this._dollarExchange =
      (Number(reserves._reserve0) / Number(reserves._reserve1)) * 1e12;

    }
    return this._dollarExchange
  }

  async init(){
    this.myProvider = new AngularNetworkProvider([]);
    await this.myProvider .init()
    await this.myProvider .initBlockSubscription()
    this.newWallet = new  AngularWallet()
    const mywallet =  await this.newWallet.init(this.myProvider.Provider)
    this.debugContract=  new AngularContract(this.debugContractMetadata)
    await this.debugContract.init(this.myProvider.Provider,mywallet)
  }
}
