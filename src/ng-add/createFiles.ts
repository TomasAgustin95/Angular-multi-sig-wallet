import { normalize } from "@angular-devkit/core";
import {
  Tree,
  Rule,
  url,
  applyTemplates,
  move,
  mergeWith,
  MergeStrategy,
  chain,
  apply,
} from "@angular-devkit/schematics";
import { configuration_options } from "./data/options.configuration";
import { IOPTIONS_EXTENDED } from "./schema";

import { classify, dasherize, camelize, underscore } from '@angular-devkit/core/src/utils/strings';
const stringUtils = {classify, dasherize, camelize, underscore };

export const createFiles = (host: Tree, _options: IOPTIONS_EXTENDED): Rule => {
  const templateRules = [];
  let toInstallKeys = []


  //////////////////// COMMON FILES /////////////////////////
  if (_options.alreadyInstalled == false || _options.reset == true){
    toInstallKeys.push(configuration_options['initial'])
  }

  toInstallKeys.push(configuration_options.dappDemos[_options.dappDemo])

  for (const service of _options.dappServices) {
    toInstallKeys.push(configuration_options.dappServices[service])
  }



  let templates_src:Array<{source:string, target:string}> =[];
  let templates_root:Array<{source:string, target:string}> =[];

  toInstallKeys.forEach(ele=> {
    templates_root = templates_root.concat(ele.templates_root);
    templates_src = templates_src.concat(ele.templates_src)
  })



/// ============ components common for demo apps ================= 
if (_options.demoToInstall== true){
    templates_src.push(     {
      source: "./files/demo-components",
      target: "/app/dapp-components",
    },)
}
  
  const options_file_replacements = { 
    ...stringUtils,
    sourceRoot: _options.sourceRoot , 
    contractCode:_options.dappDemo,
    metadata:_options.dappDemo + 'Metadata'  }


  for (const rootFile of templates_root) {
    const templateRoot= apply(url(rootFile.source), [
      applyTemplates(options_file_replacements),
      move(normalize(rootFile.target)),
    ]);

    templateRules.push(
      mergeWith(templateRoot, MergeStrategy.Overwrite)
    );
  }

  for (const srcFile of templates_src) {
    const templateSrc = apply(url(srcFile.source), [
      applyTemplates(options_file_replacements),
      move(normalize(`/${_options.sourceRoot}${srcFile.target}`)),
    ]);

    templateRules.push(
      mergeWith(templateSrc, MergeStrategy.Overwrite)
    );
  }




    const templateCommonHardhat = apply(url("./files/common/hardhat"), [
      applyTemplates({ sourceRoot: _options.sourceRoot , contractCode:_options.dappDemo }),
      move(normalize(`/hardhat/`)),
    ]);

    templateRules.push(
      mergeWith(templateCommonHardhat, MergeStrategy.Overwrite)
    );

  const templateInjector = apply(url("./files/common/dapp/dapp-injector"), [
    applyTemplates({ sourceRoot: _options.sourceRoot, metadata:_options.dappDemo + 'Metadata' }),
    move(normalize(normalize(`/${_options.sourceRoot}/app/dapp-injector`))),
  ]);

  templateRules.push(mergeWith(templateInjector, MergeStrategy.Overwrite));

  const templateCommonApp = apply(url("./files/common/dapp/app"), [
    applyTemplates({ contractCode:_options.dappDemo }),
    move(normalize(normalize(`/${_options.sourceRoot}/app/`))),
  ]);

  templateRules.push(mergeWith(templateCommonApp, MergeStrategy.Overwrite));



  // if (!host.exists(`${_options.sourceRoot}/typings.d.ts`)) {
  //   const templateTypings = apply(url("./files/typings"), [
  //     applyTemplates({}),
  //     move(normalize(`/${_options.sourceRoot}/`)),
  //   ]);
  //   templateRules.push(mergeWith(templateTypings));
  // }

  return chain(templateRules);
};
