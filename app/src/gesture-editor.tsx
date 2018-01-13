import * as React from "react";
import { RecorderButton } from "./recorder";
import { Gesture, GestureExampleData } from "./gesture-data";
import { SingleDTWCore } from "./model";
// import { RecognitionOverlay } from "./visualizations";
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

    public render() {
        /**
         * this function is passed to an editable GraphCard component which contains a delete button
         * @param gid the unique gesture id of the gesture that contains the sample which is going to be deleted
         * @param sid the unique sample id which is going to be deleted
         */
        const onSampleDelete = (gesture: Gesture, sample: GestureExampleData) => {
            gestureStore.deleteSample(gesture, sample);
        }

        const renameGesture = (event: any) => {
            this.props.gesture.name = event.target.value;
            this.props.model.updateName(event.target.value);
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
            <div className="ui " id="gesture-editor">
            
                <div className="ui text menu">
                    <button className="ui button icon huge clear" id="back-btn" onClick={this.props.backToMain}>
                        <i className="icon chevron left large"></i>
                    </button>
                    {gestureStore.hasBeenModified ? <span className="ui floated left">*</span> : undefined}

                </div>

                <div className="ui grid">

                    <div className="ui twelve wide column">
                        <div className="ui form">
                            <div className="inline fields">
                                <div className="field">
                                    <label>Name</label>
                                    <input
                                        type="text"
                                        ref="gesture-name-input"
                                        value={this.props.gesture.name}
                                        // onFocus={() => { this.recorder ? this.recorder.PauseEventListeners() : undefined; }}
                                        // onBlur={() => { this.recorder ? this.recorder.ResumeEventListeners() : undefined }}
                                        onChange={renameGesture}
                                        onKeyDown={e => { if (e.keyCode == 13) e.currentTarget.blur(); }}
                                    />
                                </div>
                            </div>
                        </div>

                        {
                            this.props.connected
                                ?
                                <div className="ui grid">
                                    <div className="ui row">
                                        <RecorderButton
                                            gesture={this.props.gesture}
                                            onNewSampleRecorded={this.props.onNewSampleRecorded}
                                        />
                                    </div>
                                    <div className="ui row" style={{ height: 200 }}>

                                        <OrientedDevice width={200} height={200} />

                                        <MotionTimeline
                                            readings={gestureStore.readings}
                                            isMatch={t => gestureStore.isMatch(t)}
                                            numReadingsToShow={gestureStore.readingLimit}
                                            width={700}
                                            height={200}
                                            hideStillMotion={true}
                                        />
                                    </div>
                                </div>
                                :
                                downloadStreamerUi
                        }
                    </div>

                    <div className="four wide column">
                        <RecordedSamples
                            gesture={gestureStore.currentGesture}
                            model={gestureStore.currentModel}
                            onDeleteHandler={onSampleDelete}
                        />
                    </div>

                </div>
            </div>
        );
    }
}