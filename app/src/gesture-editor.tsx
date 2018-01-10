import * as React from "react";
import { RecorderButton } from "./recorder";
import { SignalPlot } from "./visualizations";
import { Gesture, GestureExampleData, Match } from "./gesture-data";
import { SingleDTWCore } from "./model";
// import { RecognitionOverlay } from "./visualizations";
import { serialData, SerialData } from "./serial-data";
import { observer } from "mobx-react";
import { RecordedSamples } from "./recorded-samples";
import { gestureStore } from "./gesture-store";
import { OrientedDevice } from "./orientation";
import { MotionTimeline } from "./timeline";


export interface GestureEditorProps {
    gesture: Gesture;
    model: SingleDTWCore;
    connected: boolean;
    onNewSampleRecorded: (gesture: Gesture, sample: GestureExampleData) => void;
    backToMain: () => void;
}


@observer
export class GestureEditor extends React.Component<GestureEditorProps, {}> {
    private plotX: SignalPlot;
    private plotY: SignalPlot;
    private plotZ: SignalPlot;
    // private recognitionOverlay: RecognitionOverlay;


    constructor(props: GestureEditorProps) {
        super(props);
        this.onSerialData = this.onSerialData.bind(this);
        serialData.register(this.onSerialData)
    }

    private onSerialData(newData: SerialData) {
        if (!this.plotX) return;
        this.plotX.update(newData.accVec.accelX);
        this.plotY.update(newData.accVec.accelY);
        this.plotZ.update(newData.accVec.accelZ);
    }

    public newMatch(match: Match) {
        // if (match.classNum != 0) {
        //     // a gesture has been recognized - create the green rectangle overlay on the realtime graph
        //     this.recognitionOverlay.add(match, this.props.model.getTick());
        // }
        // this.recognitionOverlay.tick(this.props.model.getTick());

    }

    /**
     * Sets the RealTimeGraph, and the Recorder uninitialized to make sure that they get initialized again when
     * editing a gesture or creating a new gesture when changing the component's state back to {editGesture: true}
     */
    resetGraph() {
        this.plotX = this.plotY = this.plotZ = undefined;
    }



    public render() {
        /**
         * this function is passed to an editable GraphCard component which contains a delete button
         * @param gid the unique gesture id of the gesture that contains the sample which is going to be deleted
         * @param sid the unique sample id which is going to be deleted
         */
        const onSampleDelete = (gesture: Gesture, sample: GestureExampleData) => {
            gestureStore.deleteSample(gesture, sample);
        }

        const downloadStreamerUi = (
            <div className="ui message">
                <div className="content">
                    <div className="header">Steps to Download Streamer</div>
                    <ul className="list">
                        <li>Make sure that the Circuit Playground Express is connected to your computer</li>
                        <li>Make sure LEDs are green or press the <code>reset</code> button once</li>
                        <li>Download the <code>streamer.uf2</code> file to the CPLAYBOOT drive</li>
                    </ul>
                    <br />
                    <a id="program-streamer-btn" className="ui button compact icon-and-text primary download-button big" href="/streamer.uf2">
                        <i className="download icon icon-and-text"></i>
                        <span className="ui text">Download Streamer</span>
                    </a>
                </div>
            </div>);

        return (
            <div className="ui" id="gesture-editor">
                <div className="ui">
                    <button className="ui button icon huge clear" id="back-btn" onClick={this.props.backToMain}>
                        <i className="icon chevron left large"></i>
                    </button>
                    {gestureStore.hasBeenModified ? <span className="ui floated left">*</span> : undefined}
                </div>
                <div className="ui three column grid">
                    <div className="ten wide column">
                        {
                            this.props.connected
                                ?
                                <div style={{ position: 'absolute' }}>
                                    <OrientedDevice width={200} height={200} />
                                    <MotionTimeline
                                        readings={gestureStore.readings}
                                        numReadingsToShow={gestureStore.readingLimit}
                                        width={600}
                                        height={200}
                                        hideStillMotion={true}
                                    />
                                </div>
                                :
                                downloadStreamerUi
                        }
                    </div>

                    <div className="three wide column">
                        {
                            this.props.connected ?
                                <RecorderButton
                                    gesture={this.props.gesture}
                                    onNewSampleRecorded={this.props.onNewSampleRecorded}
                                /> :
                                undefined
                        }
                    </div>
                </div>

                <RecordedSamples
                    gesture={gestureStore.currentGesture}
                    model={gestureStore.currentModel}
                    onDeleteHandler={onSampleDelete}
                />
            </div>
        );
    }
}