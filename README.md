# WAVETRO TEST ZONE (Source Code)

*If you're just looking for the 2D/3D/audio assets, you'll want [this repo](https://github.com/wavetro/testzone-assets) instead.*

### 🔨 How to build

My workflow usually revolves around [Babylon.js](https://www.babylonjs.com/) and [Vite](https://vitejs.dev/).

1. Make sure you have `npm` installed and configured, usually with a JavaScript runtime environment like [Node](https://nodejs.org/en/download/).
2. Download or clone the source code project folder(s) that you're interested in and place them all in a single directory, such as the default root "testzone-main" folder you get from cloning the repo or extracting the .ZIP download.
3. Navigate to that root folder in a terminal and run `npm i vite` and `npm i -D @babylonjs/core`. Depending on the project, you may also have to repeat `npm i -D` for some of the following: `@babylonjs/inspector`, `@babylonjs/loaders`, or something similar. You can check the import statements at the top of the TypeScript files to see what you need. *(For WTZ000, run `npm i -D three` and `npm i tweakpane` instead of anything `@babylonjs`-related.)*
4. Head over to the [assets repo](https://github.com/wavetro/testzone-assets) and download/clone it, merging the necessary project folders from there into your copy of this repo's source code. Also, refer to the CSS files for where to place the .WOFF fonts in the `ALL` folder from that repo.
5. You can now preview the code in your browser by running `npm run dev` in any project's subdirectory, or you can build the project by running `npm run build`. The output will appear in a "dist" folder.
6. Optionally, you can run [terser](https://terser.org/) on the outputted JS files to optimize/secure it further. You can install it with `npm i terser` and run it with `npx terser <OUTPUTTED_FILENAME_HERE>.js -o <OUTPUTTED_FILENAME_HERE>.js -c -m`.
7. IMPORTANT: You may have to go to every outputted HTML/CSS file in the "dist" folder and add a trailing dot to any relative filepaths. For example, any mention of `/assets/file.png` needs to be `./assets/file.png` to work properly. I have no clue how to make Vite do this automatically.

And you're now done! You can now deploy the contents of the "dist" folder to any static host of your choice.

---------------------------------------------------------------------------

DISCLAIMER: I do not owe you tech support or tutorials by sharing these files. If you [contact me](https://wavetro.net/contact) with questions, I'll help you to the best of my availability, but you're on your own for everything I can't or refuse to do.

All files in this repository are licensed under the [GNU Affero General Public v3 License](https://www.gnu.org/licenses/agpl-3.0.en.html). ***This isn't legal advice, but the license basically states that anything you make with these files must also be fully open-sourced and published to a public code repo like GitHub under the same license.*** I do not endorse whatever you or anyone else uses these files for.

![AGPLv3](https://www.gnu.org/graphics/agplv3-155x51.png)

*(back to [play.wavetro.net](https://play.wavetro.net/))*
