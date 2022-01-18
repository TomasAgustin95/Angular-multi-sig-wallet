
import { InjectionToken } from '@angular/core';
import HelloWorldContractMetadata from '../../../../assets/contracts/hello_world_contract_metadata.json';
import { ContractShowModule, AddressShowModule, BlockchainModule, DialogModule, NotifierModule } from 'angularonchain';
import { NetworkProviderService, ContractService, WalletService } from 'angularonchain';

export const localNodeProvider = new InjectionToken<NetworkProviderService>('localNodeProvider');
export const helloWorldContract = new InjectionToken<ContractService>('helloWorldContract')

export const blockchain_imports = [ContractShowModule,AddressShowModule,BlockchainModule,DialogModule,NotifierModule]
export const blockchain_providers = [ {provide: 'localNodeProvider', useValue: new NetworkProviderService([])},
{provide: 'helloWorldContract', useValue: new ContractService(HelloWorldContractMetadata )}, WalletService]