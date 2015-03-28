# Design-lego

[![Gitter chat](https://badges.gitter.im/gitterHQ/gitter.png)](https://gitter.im/sourcejs/Source)

**v0.1.0-alpha (first concept)**

[SourceJS](http://sourcejs.com) companion app, for layout prototyping based on own blocks library. Could be also used separately, without SourceJS, check `/user-bootstrap` demo (runs by default).

![image](http://habrastorage.org/files/6fd/bd8/4e4/6fdbd84e4ea2492f902c250d7dcd1d50.png)

**[Demo video](https://www.youtube.com/watch?v=cefy_U5NU4o)**

If you're already using [SourceJS](http://sourcejs.com) engine for organising your front-end component library, check demo configuration folder for integration `/user-source-ok-demo`. As from 0.4.0 SourceJS has own Content API, that lets you request any block resources from your library, all you need is to set some basic configuration for Design-Lego app.

For running your own block library with Design-Lego app, all you need is to generate JSON data file with [similar structure](https://github.com/sourcejs/lego/blob/master/user-bootstrap/data/bootstrap/bootstrap.json). For bootstrap integration, we created [simple parser](https://github.com/sourcejs/lego/blob/master/parser/bootstrap.js) for required data generation.

## Features

* Load your own component library (based on any frameworks and templating engines)
* Review your existing blocks through search and switch between different variations (block examples)
* If you're seperating CSS modifiers, Design-Lego will parse your CSS and suggest existing modifiers for your currently selected block
* Build lite prototypes with different components combination and share
* Block layout drop predictions

## Setup

```
git clone https://github.com/sourcejs/lego.git
cd lego
npm i
node lego
```

NodeJS will run local server, with pre-build bootstrap library for playing in Design-lego app.

## Upcoming features

* Configurable layouts
* Improved UI
* Improved prototyping features with drag n drop
* Easy to setup configuration with SourceJS
* Component export to tools for designing in the browser
