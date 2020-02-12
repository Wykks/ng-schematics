# Overview

This repository contains a single schematic usable with angular CLI `ng new` command.

It will generate a new project in replacement of angular CLI default one.

It can be used like this:

```bash
# With Yarn
yarn global install @wykks/schematics

# With Npm
npm install -g @wykks/schematics

# In a unix-like shell
ng new <app name> --collection=@wykks/schematics [--directory=<folder name>] [--title=<some text>] [--prefix=<some prefix>]
```

Keep in mind that, dependencies listed in generated package.json may not be up to date.

## What's in it?

Run ng-new of Angular CLI, then apply the following changes :
- Add Jest (in place of karma) with @ngneat/spectator and ng-mocks
- Remove protractor
- Add prettier and tslint-config-prettier
- Add lint-staged with husky to launch lint and prettier on commit
- Add commitizen (without hooks, just through commit script)
- Add typescript-tslint-plugin with vscode config
- Enforce onPush change detection strategy

## Development

### Building

Before testing it locally you need to build (transpile typescript to javascript).

```bash
yarn build
```

If you want to build automatically after changes, just use `tsc` watch mode:

```bash
yarn build -w
```

### Running locally

```bash
ng new --collection="." test --dry-run [--routing=false]
```

### Debugging

You can debug it with the classic toolkit (chrome devtools or your IDE):

```bash
node --inspect-brk ./node_modules/.bin/ng new --collection="." test --dry-run --routing=false
```

With Chrome devtools for instance, you can then go to `chrome://inspect` and start debugging.
For Webstorm, you will need to create a node debugging task, etc.

### Publishing

To publish, simply do:

```bash
yarn build
yarn publish
```

That's it!
