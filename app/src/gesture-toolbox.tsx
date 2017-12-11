/// <reference path="../node_modules/pxt-core/built/pxteditor.d.ts"/>

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as viz from "./visualizations";
import { SingleDTWCore } from "./model";
import { GraphCard } from "./graphcard";
import { Gesture, GestureSample, SignalReading } from "./gesture-data";
import { GestureEditor } from "./gesture-editor";
import { RecordedSamples } from "./recorded-samples";
import { serialData } from "./serial-data";
import { gestureStore } from "./gesture-store";


export const gesturesContainerID: string = "gestures-container";



interface GestureToolboxState {
    // show or hide the GestureToolbox
    visible?: boolean;
    // switch between the edit gesture mode and the main gesture view containing all of the recorded and imported gestures
    editGestureMode?: boolean;
}



export class GestureToolbox extends React.Component<{}, GestureToolboxState> {
    private intervalID: NodeJS.Timer;
    private gestureEditor: GestureEditor;



    constructor(props: {}) {
        super(props);

        let data: Gesture[] = [];

        this.state = {
            visible: false,
            editGestureMode: false,
        };
    }


    componentDidMount() {
        serialData.register(newData => {
            if (gestureStore.currentModel && gestureStore.currentModel.isRunning()) {
                let match = gestureStore.currentModel.Feed(newData.accVec);
                if (this.gestureEditor)
                    this.gestureEditor.newMatch(match);
            }
        })
    }



    hide() {
        // generates the blocks and reloads the workspace to make them available instantly 
        // though it will not reload if there were no changes to any of the gestures
        gestureStore.saveBlocks();

        this.setState({ visible: false, editGestureMode: false });
        if (this.gestureEditor)
            this.gestureEditor.resetGraph();

        gestureStore.deleteIfGestureEmpty();
    }


    show() {
        this.setState({ visible: true });
    }


    render() {
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
        }

        /**
         * updates this.state.data[] array and the models[] array with a 
         * new Gesture and switches to the editGesture window
         */
        const newGesture = () => {
            this.setState({ editGestureMode: true });
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
            this.setState({ editGestureMode: true });
            if (this.gestureEditor)
                this.gestureEditor.resetGraph();
            gestureStore.setCurrentGesture(gestureID);
        }


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
         * this function is passed to an editable GraphCard component which contains a delete button
         * @param gid the unique gesture id of the gesture that contains the sample which is going to be deleted
         * @param sid the unique sample id which is going to be deleted
         */
        const onSampleDelete = (gesture: Gesture, sample: GestureSample) => {
            gestureStore.deleteSample(gesture, sample);
        }

        /**
         * This function is passed to the recorder to be called when a new gesture was recorded.
         * It will be called when the media stream recorder has finished generating the recorded video.
         * It will then update the this.state.data[] array, regenerate the DTW model, and update the scrollbar.
         */
        const onNewSampleRecorded = (gesture: Gesture, newSample: GestureSample) => {
            gestureStore.addSample(gesture, newSample);
        }



        const inputStyle = { height: "30px", padding: "auto auto auto 6px" };
        const gestureContainerMargin = { margin: "0 15px 15px 0" };
        const headerStyle = { height: "60px" };
        const buttonHeightStyle = { height: "30px" };
        const mainGraphStyle = { margin: "15px 15px 15px 0" };

        return (
            <div className="ui">
                <div className="ui segment">
                    {this.state.editGestureMode
                        ?
                        <button className="ui button icon huge clear" id="back-btn" onClick={() => backToMain()}>
                            <i className="icon chevron left large"></i>
                        </button>
                        : undefined
                    }
                    {gestureStore.hasBeenModified ? <span className="ui floated left">*</span> : undefined}
                </div>
                <div className="ui segment bottom attached tab active tabsegment">
                    {
                        !this.state.editGestureMode ?
                            <div className="ui">
                                <div className="ui buttons">
                                    <button className="ui button primary" onClick={() => newGesture()}>
                                        New Gesture...
                                    </button>
                                </div>
                                <div className="ui divider"></div>
                                {
                                    gestureStore.gestures.map(gesture =>
                                        <div
                                            className="ui segments link-effect gesture-container"
                                            key={gesture.gestureID}
                                            style={gestureContainerMargin}
                                        >
                                            <div className="ui segment inverted teal" style={headerStyle}>
                                                <div className="ui header inverted left floated">
                                                    {gesture.name}
                                                </div>
                                                <button
                                                    className="ui icon button purple inverted compact tiny right floated"
                                                    onClick={() => { editGesture(gesture.gestureID) }}
                                                >
                                                    Edit Gesture
                                                </button>
                                            </div>
                                            <div className="ui segment">
                                                <div className="ui grid">
                                                    <GraphCard
                                                        key={gesture.gestureID}
                                                        editable={false}
                                                        gesture={gesture}
                                                        sample={gesture.displayGesture}
                                                        dx={7}
                                                        graphHeight={70}
                                                        maxVal={2450}
                                                        style={mainGraphStyle}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }
                            </div>
                            :
                            <div>
                                <GestureEditor
                                    ref={ge => {
                                        this.gestureEditor = ge;
                                    }}
                                    gesture={gestureStore.currentGesture}
                                    model={gestureStore.currentModel}
                                    connected={gestureStore.connected}
                                    onNewSampleRecorded={onNewSampleRecorded}
                                />
                                <RecordedSamples
                                    gesture={gestureStore.currentGesture}
                                    model={gestureStore.currentModel}
                                    onDeleteHandler={onSampleDelete}
                                />
                            </div>
                    }
                </div>
            </div>
        )
    }
}
