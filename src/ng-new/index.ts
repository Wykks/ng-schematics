import {
  Rule,
  chain,
  externalSchematic,
  Tree,
  applyToSubtree,
  SchematicContext,
  mergeWith,
  apply,
  url,
  template
} from '@angular-devkit/schematics';
import { NodePackageInstallTask, RepositoryInitializerTask } from '@angular-devkit/schematics/tasks';
import { strings, workspaces } from '@angular-devkit/core';
import {
  NodeDependencyType,
  addPackageJsonDependency,
  removePackageJsonDependency
} from '@schematics/angular/utility/dependencies';
import { updateWorkspace } from '@schematics/angular/utility/workspace';
import { jestChain } from './jest';

import { addOnPushToComponent } from './addOnPush';

function removeProtractor(host: Tree) {
  host.getDir('e2e').visit(file => {
    host.delete(file);
  });
  removePackageJsonDependency(host, 'protractor');
  return host;
}

function editTsConfig(host: Tree) {
  const tsConfigPath = '/tsconfig.json';

  const tsConfigText = host.read(tsConfigPath)!.toString('utf-8');
  const tsConfig = JSON.parse(tsConfigText);

  tsConfig.compilerOptions.strict = true;
  tsConfig.compilerOptions.strictPropertyInitialization = false;
  tsConfig.compilerOptions.noUnusedParameters = true;
  tsConfig.compilerOptions.noUnusedLocals = true;
  tsConfig.compilerOptions.plugins = [{ name: 'typescript-tslint-plugin' }];
  tsConfig.angularCompilerOptions.strictTemplates = true;

  host.overwrite(tsConfigPath, JSON.stringify(tsConfig, null, 2));
}

function addConfigToPackageJSON(host: Tree) {
  const packageJsonPath = '/package.json';

  const packageJsonText = host.read(packageJsonPath)!.toString('utf-8');
  const packageJson = JSON.parse(packageJsonText);

  packageJson.husky = {
    hooks: {
      'pre-commit': 'lint-staged'
    }
  };

  packageJson['lint-staged'] = {
    '*.{js,json,css,scss,md,ts,html}': 'prettier --write',
    '*.ts': 'tslint -c tslint.json -p tsconfig.json --fix'
  };

  packageJson.commitizen = {
    path: 'cz-conventional-changelog'
  };

  const scripts = packageJson.scripts;

  delete scripts['e2e'];

  scripts.test = 'ng test --watch';
  scripts.build = 'ng build --prod --no-progress';
  scripts['test:ci'] = 'ng test --ci --silent';
  scripts.commit = 'lint-staged && git-cz --no-verify';

  host.overwrite(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

function addDependenciesToPackageJson(host: Tree) {
  [
    {
      type: NodeDependencyType.Dev,
      name: 'husky',
      version: '^4.2.0'
    },
    {
      type: NodeDependencyType.Dev,
      name: 'lint-staged',
      version: '^10.0.0'
    },
    {
      type: NodeDependencyType.Dev,
      name: 'prettier',
      version: '^1.19.0'
    },
    {
      type: NodeDependencyType.Dev,
      name: 'tslint-config-prettier',
      version: '^1.18.0'
    },
    {
      type: NodeDependencyType.Dev,
      name: 'typescript-tslint-plugin',
      version: '^0.5.5'
    },
    {
      type: NodeDependencyType.Dev,
      name: 'commitizen',
      version: '^4.0.0'
    },
    {
      type: NodeDependencyType.Dev,
      name: 'cz-conventional-changelog',
      version: '^3.1.0'
    }
  ].forEach(dependency => addPackageJsonDependency(host, dependency));
  return host;
}

function editAngularConfig(workspace: workspaces.WorkspaceDefinition) {
  workspace.projects.forEach(project => {
    project.targets.delete('e2e');
    project.targets.get('lint')!.options!.format = 'stylish';
  });
}

function editTsLint(host: Tree) {
  const tsLintPath = '/tslint.json';

  const tsLintText = host.read(tsLintPath)!.toString('utf-8');
  const tsLint = JSON.parse(tsLintText);

  if (tsLint.extends) {
    if (Array.isArray(tsLint.extends)) {
      tsLint.extends.push('tslint-config-prettier');
    } else {
      tsLint.extends = [tsLint.extends, 'tslint-config-prettier'];
    }
  } else {
    tsLint.extends = ['tslint-config-prettier'];
  }
  tsLint.rules['prefer-on-push-component-change-detection'] = true;

  host.overwrite(tsLintPath, JSON.stringify(tsLint, null, 2));
}

export default function(options: any): Rule {
  if (!options.directory) {
    options.directory = options.name;
  }

  const angularNgNewOptions = {
    name: options.name,
    version: options.version,
    newProjectRoot: options.newProjectRoot,
    strict: false,
    packageManager: options.packageManager,
    projectRoot: '',
    inlineStyle: options.inlineStyle,
    inlineTemplate: options.inlineTemplate,
    prefix: options.prefix,
    viewEncapsulation: options.viewEncapsulation,
    routing: options.routing,
    style: 'scss',
    skipInstall: true,
    skipGit: true,
    skipTests: true
  };

  return chain([
    externalSchematic('@schematics/angular', 'ng-new', angularNgNewOptions),
    applyToSubtree(options.directory, [
      jestChain,
      removeProtractor,
      updateWorkspace(editAngularConfig),
      addDependenciesToPackageJson,
      editTsConfig,
      addConfigToPackageJSON,
      editTsLint,
      addOnPushToComponent,
      mergeWith(apply(url('./files'), [template({ utils: strings })]))
    ]),
    (_host: Tree, context: SchematicContext) => {
      let packageTask;
      if (!options.skipInstall) {
        packageTask = context.addTask(
          new NodePackageInstallTask({
            workingDirectory: options.directory,
            packageManager: options.packageManager
          })
        );
      }
      if (!options.skipGit) {
        const commit = typeof options.commit == 'object' ? options.commit : !!options.commit ? {} : false;

        context.addTask(new RepositoryInitializerTask(options.directory, commit), packageTask ? [packageTask] : []);
      }
    }
  ]);
}
