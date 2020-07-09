import { workspaces } from "@angular-devkit/core";
import { chain, Tree } from "@angular-devkit/schematics";
import {
  addPackageJsonDependency,
  removePackageJsonDependency,
} from "@schematics/angular/utility/dependencies";
import { updateWorkspace } from "@schematics/angular/utility/workspace";
import stripJsonComments from "strip-json-comments";
import { jestDependencies } from "./dependencies";

export function addDependenciesToPackageJson(host: Tree) {
  jestDependencies.forEach((dependency) =>
    addPackageJsonDependency(host, dependency)
  );
  return host;
}

function removeKarma(host: Tree) {
  host.delete("karma.conf.js");
  if (host.exists("/src/test.ts")) {
    host.delete("/src/test.ts");
  }
  [
    "karma",
    "karma-chrome-launcher",
    "karma-coverage-istanbul-reporter",
    "karma-jasmine",
    "karma-jasmine-html-reporter",
    "@types/jasmine",
    "@types/jasminewd2",
    "jasmine-core",
    "jasmine-spec-reporter",
  ].forEach((name) => removePackageJsonDependency(host, name));
  return host;
}

function editTsSpecConfig(host: Tree) {
  const tsConfigPath = "/tsconfig.spec.json";

  const tsConfigText = host.read(tsConfigPath)!.toString("utf-8");
  const tsConfig = JSON.parse(stripJsonComments(tsConfigText));

  const textFileIdx = tsConfig.files.findIndex((file: string) =>
    file.endsWith("test.ts")
  );
  if (textFileIdx > -1) {
    tsConfig.files.splice(textFileIdx, 1);
  }
  const jasmineTypeIdx = tsConfig.compilerOptions.types.findIndex(
    (type: string) => type === "jasmine"
  );
  if (jasmineTypeIdx > -1) {
    tsConfig.compilerOptions.types.splice(jasmineTypeIdx, 1);
  }
  tsConfig.compilerOptions.types.unshift("jest");
  tsConfig.compilerOptions.esModuleInterop = true;
  tsConfig.compilerOptions.emitDecoratorMetadata = true;

  host.overwrite(tsConfigPath, JSON.stringify(tsConfig, null, 2));
}

function editAngularConfig() {
  return updateWorkspace((workspace: workspaces.WorkspaceDefinition) => {
    workspace.projects.forEach((project) => {
      project.targets.delete("test");
      project.targets.set("test", { builder: "@angular-builders/jest:run" });
      project.extensions.schematics = {
        "@ngneat/spectator:spectator-component": {
          style: "scss",
          changeDetection: "OnPush",
          jest: true,
        },
        "@ngneat/spectator:spectator-service": {
          jest: true,
        },
        "@ngneat/spectator:spectator-directive": {
          jest: true,
        },
      };
    });
    workspace.extensions.cli = {
      defaultCollection: "@ngneat/spectator",
    };
  });
}

// Originally designed to be in a separate schematics.
// But for some reason, host.delete doesn't work when running within schematics()...
export const jestChain = chain([
  removeKarma,
  addDependenciesToPackageJson,
  editTsSpecConfig,
  editAngularConfig,
]);
