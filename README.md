# WAVETRO TEST ZONE (Source Code)

*If you're just looking for the 2D/3D/audio assets, you'll want [this repo](https://github.com/wavetro/testzone-assets) instead.*

### 🔨 How to build

My workflow revolves around [Babylon.js](https://www.babylonjs.com/), [TypeScript](https://www.typescriptlang.org/), and [Vite](https://vitejs.dev/). *(WTZ00 uses [THREE.js](https://threejs.org/) instead of Babylon.)*

1. Make sure you have `npm` installed, which is usually done with a runtime environment like [Node.js](https://nodejs.org/en/download/).
2. Download or clone the contents of this repo and make sure it all stays in a single folder.
3. Navigate to that single root folder in a terminal and run the following commands:
- `npm i typescript`
- `npm i vite`
- `npm i @babylonjs/core`
- `npm i @babylonjs/loaders`
- `npm i ammojs-typed`
- `npm i terser` *(for step 6, optional)*
- `npm i three` *(for WTZ00 only)*
- `npm i tweakpane` *(for WTZ00 only)*
4. Download or clone the [assets repo](https://github.com/wavetro/testzone-assets) and merge the project folders from there into your copy of this repo's source code. You may also want to copy the font files from that repo's `ALL` directory into the folder of any project you plan to build or run.
5. You can now preview the code in your browser by running `npm run dev` in any project's folder, or you can build the project by running `npm run build`. The output will appear in a "dist" subdirectory. *(If Vite is giving you an error about missing packages, go back to the root folder and use `npm i` to download them.)*
6. After you build the source, you can optionally run [terser](https://terser.org/) on the outputted code to secure it. You can do this by running `npx terser EXAMPLE_NAME.js -o EXAMPLE_NAME.js -c -m` on every JS file in the "dist" folder.
7. IMPORTANT: To make sure the final output works properly when deployed online, go to every HTML/CSS file in the "dist" folder and add a dot prefix to EVERY filepath that starts with `/`. For example, any mention of `/assets/file.png` needs to be `./assets/file.png`. I have no clue how to make Vite do this automatically.
8. If everything looks good after running `npm run preview` in the project folder, you're done!

You can now deploy the contents of the "dist" folder to any static host of your choice.

---------------------------------------------------------------------------

DISCLAIMER: I do not owe you tech support or tutorials by sharing these files. If you [contact me](https://wavetro.net/contact) with questions, I'll help you to the best of my availability, but you're on your own for everything I can't or refuse to do.

All files in this repository are licensed under the [GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.en.html). ***This isn't legal advice, but the license basically states that anything you make with these files must also be fully open-sourced and published to a public code repo under the same terms.*** I do not endorse whatever you or anyone else uses these files for.

![AGPLv3](https://www.gnu.org/graphics/agplv3-155x51.png)

*(back to [play.wavetro.net](https://play.wavetro.net/))*
