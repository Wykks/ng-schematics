import ts = require('typescript');
import { relative } from 'path';
import { Tree, UpdateRecorder } from '@angular-devkit/schematics';

// Totally overkill, but this could be usefull for ref
// Not really robust without typeChecker
// but it's not trivial to load the typeChecker with the virtual tree
export function addOnPushToComponent(host: Tree) {
  const tsHost = ts.createCompilerHost({}, true);
  tsHost.readFile = (fileName: string) => {
    const treeRelativePath = relative('/', fileName);
    const buffer = host.read(treeRelativePath);
    return buffer ? buffer.toString() : undefined;
  };
  const appComponentFilePath = '/src/app/app.component.ts';
  const program = ts.createProgram([appComponentFilePath], {}, tsHost);
  const appComponentSourceFile = program.getSourceFiles()[0];
  const update = host.beginUpdate(appComponentFilePath);
  appComponentSourceFile.forEachChild(node => {
    if (ts.isClassDeclaration(node)) {
      addOnPushToComponentDecorator(node, update);
    }
    if (ts.isImportDeclaration(node)) {
      if ((<any>node.moduleSpecifier).text === '@angular/core') {
        const importTokens = (<ts.NamedImports>node.importClause!.namedBindings).elements;
        const lastImportToken = importTokens[importTokens.length - 1];
        update.insertRight(lastImportToken.getEnd(), ', ChangeDetectionStrategy');
      }
    }
  });
  host.commitUpdate(update);
  return host;
}

function addOnPushToComponentDecorator(node: ts.ClassDeclaration, update: UpdateRecorder) {
  const componentDecorator: ts.Decorator = node.decorators!.find(
    node => (<any>node.expression).expression.escapedText === 'Component'
  )!;
  if (!ts.isCallExpression(componentDecorator.expression)) {
    console.warn('AppComponent OnPush addition: component decorator not recognised, skipping...');
    return;
  }
  const componentDecoratorArg = <ts.ObjectLiteralExpressionBase<ts.ObjectLiteralElement>>(
    componentDecorator.expression.arguments[0]
  );
  const lastComponentOption = componentDecoratorArg.properties[componentDecoratorArg.properties.length - 1];

  update.insertRight(lastComponentOption.getEnd(), ',\n  changeDetection: ChangeDetectionStrategy.OnPush');
}
