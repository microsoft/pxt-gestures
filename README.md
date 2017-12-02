
# pxt-gestures

This is an experimental package to train and replay gesture recognizer on MakeCode editors. It is currently supported for the Adafruit Circuit Playground Express only.



## Building

The root folder contains the pxt package that gets loaded in the MakeCode editor.
The ``app`` folder contains the React App that gets loaded in the editor IFrame and interacts with the editor.

## Building the app

* go to ``app``
* run ``npm install``
* run ``npm run test`` for local dev
* run ``npm run deploy`` for deployment to github pages

## Building the package

* Setup a local MakeCode development for  your target (e.g. pxt-adafruit)
* Clone this repo under ``/projects``
* Launch the local server
* Create a new project and edit manually the ``pxt.json`` to add

```
   dependencies: {
       "pxt-gestures": "file:../pxt-gestures",
       ...
   }
```
* reload project and your package should be loaded
* open ``input`` block category, click on ``Gestures Editor``

## MakeCode

* for PXT/adafruit

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
