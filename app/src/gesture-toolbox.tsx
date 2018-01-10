/// <reference path="../node_modules/pxt-core/built/pxteditor.d.ts"/>

import * as React from "react";
import { observer } from "mobx-react";
import { Gesture, GestureExampleData } from "./gesture-data";
import { GestureEditor } from "./gesture-editor";
import { serialData } from "./serial-data";
import { gestureStore } from "./gesture-store";
import { observable } from "mobx";
import { GestureGallery } from "./gesture-gallery";




@observer
export class GestureToolbox extends React.Component<{}, {}> {
    private gestureEditor: GestureEditor;
    // switch between the edit gesture mode and the main gesture view containing all of the recorded and imported gestures
    @observable editMode?: boolean;



    constructor(props: {}) {
        super(props);
        this.state = {
            visible: false,
            editGestureMode: false,
        };
    }


    componentDidMount() {
        serialData.register(newData => {
            if (gestureStore.currentModel && gestureStore.currentModel.isRunning()) {
                let match = gestureStore.currentModel.Feed(newData.accVec);
                if (this.gestureEditor && match.valid) {
                    this.gestureEditor.newMatch(match);
                }
            }
        })
    }



    hide() {
        // generates the blocks and reloads the workspace to make them available instantly 
        // though it will not reload if there were no changes to any of the gestures
        gestureStore.saveBlocks();

        this.editMode = false;
        if (this.gestureEditor)
            this.gestureEditor.resetGraph();

        gestureStore.deleteIfGestureEmpty();
    }


    render() {


        /**
         * Updates the gesture description
         */
        // const renameDescription = (event: any) => {
        //     let cloneData = this.state.data.slice();
        //     cloneData[this.curGestureIndex].description = event.target.value;
        //     gestureStore.currentModel.UpdateDescription(cloneData[this.curGestureIndex].description);

        //     this.setState({ data: cloneData });
        //     this.markDirty();
        // }

        /**
         * This function is passed to the recorder to be called when a new gesture was recorded.
         * It will be called when the media stream recorder has finished generating the recorded video.
         * It will then update the this.state.data[] array, regenerate the DTW model, and update the scrollbar.
         */
        const onNewSampleRecorded = (gesture: Gesture, newSample: GestureExampleData) => {
            gestureStore.addSample(gesture, newSample);
        }


        /**
         * updates this.state.data[] array and the models[] array with a 
         * new Gesture and switches to the editGesture window
         */
        const newGesture = () => {
            this.editMode = true;
            if (this.gestureEditor)
                this.gestureEditor.resetGraph();
            gestureStore.addGesture();
        }

        /**
         * sets the current active gesture with the given gesture id and 
         * switches to the editGesture window
         * @param gestureID the unique gesture id to switch to
         */
        const editGesture = (gestureID: number) => {
            this.editMode = true;
            if (this.gestureEditor)
                this.gestureEditor.resetGraph();
            gestureStore.setCurrentGesture(gestureID);
        }

        /**
         * returns from the editGesture window to the main window and 
         * generates the gesture blocks if they have been modified
         */
        const backToMain = () => {
            // update name
            // cloneData[this.curGestureIndex].name = (ReactDOM.findDOMNode(this.refs["gesture-name-input"]) as HTMLInputElement).value;
            // update blocks if was touched
            gestureStore.saveBlocks();

            if (this.gestureEditor)
                this.gestureEditor.resetGraph();
            gestureStore.deleteIfGestureEmpty();
            this.editMode = false;
        }


        return (
            <div className="ui">
                <div className="ui bottom attached tab active tabsegment">
                    {
                        this.editMode
                            ?
                            <GestureEditor
                                ref={ge => this.gestureEditor = ge}
                                gesture={gestureStore.currentGesture}
                                model={gestureStore.currentModel}
                                connected={gestureStore.connected}
                                onNewSampleRecorded={onNewSampleRecorded}
                                backToMain={backToMain}
                            />
                            :
                            <GestureGallery
                                newGesture={newGesture}
                                editGesture={editGesture}
                            />
                    }
                </div>
            </div>
        )
    }
}
