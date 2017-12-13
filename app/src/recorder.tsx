import { SignalReading, GestureSample, Gesture } from './gesture-data';
import * as d3 from 'd3';
import * as React from 'react';
import { serialData, SerialData } from './serial-data';
import { observer } from 'mobx-react';


export enum RecordMode {
    PressAndHold,
    PressToToggle
}

export interface RecorderButtonProps {
    gesture: Gesture;
    onNewSampleRecorded: (gesture: Gesture, sample: GestureSample) => void;
}


@observer
export class RecorderButton extends React.Component<RecorderButtonProps, {}> {
    private recordMode = RecordMode.PressAndHold;
    private enabled: boolean;
    private isRecording: boolean;
    private wasRecording: boolean;
    private sample: GestureSample;
    private recordBtn: any;


    constructor(props: RecorderButtonProps) {
        super(props);
        this.enabled = true;
        this.wasRecording = false;
        this.isRecording = false;
        this.onSerialData = this.onSerialData.bind(this);
        serialData.register(this.onSerialData);
    }

    componentDidMount() {
        this.SetRecordingMethod(this.recordMode);
    }

    private onSerialData(newData: SerialData) {
        this.Feed(newData.accVec);
    }

    public Feed(yt: SignalReading) {
        if (this.enabled) {
            if (!this.wasRecording && this.isRecording) {
                // start recording
                this.sample = new GestureSample();
                this.sample.startTime = Date.now();
                this.sample.rawData.push(yt);

                this.recordBtn.classed("green", true);
            } else if (this.wasRecording && this.isRecording) {
                // continue recording
                this.sample.rawData.push(yt);
            } else if (this.wasRecording && !this.isRecording) {
                // stop recording
                this.sample.endTime = Date.now();
                this.sample.cropStartIndex = 0;
                this.sample.cropEndIndex = this.sample.rawData.length - 1;
                this.props.onNewSampleRecorded(this.props.gesture, this.sample);

                this.recordBtn.classed("green", false);
            }

            this.wasRecording = this.isRecording;
        }
    }

    public Disable() {
        this.enabled = false;
    }

    public SetRecordingMethod(recordMode: RecordMode) {
        this.recordMode = recordMode;

        const forMe = () => document.activeElement.tagName.toLowerCase() !== 'input';

        if (recordMode == RecordMode.PressAndHold) {
            // assign events to capture if recording or not
            document.onkeydown = (e: any) => {
                // if pressed "space" key
                if (forMe() && e.keyCode == 32) {
                    this.isRecording = true;
                }
            };

            document.onkeyup = (e: any) => {
                // if released "space" key
                if (forMe() && e.keyCode == 32) {
                    this.isRecording = false;
                }
            };
        } else if (recordMode == RecordMode.PressToToggle) {
            // assign events to capture if recording or not
            document.onkeydown = (e: any) => {
                // if pressed "space" key
                if (forMe() && e.keyCode == 32) {
                    this.isRecording = !this.isRecording;
                }
            };

            delete document.onkeyup;
        }
    }

    public PauseEventListeners() {
        delete window.onkeydown;
        delete window.onkeyup;
    }

    public ResumeEventListeners() {
        this.SetRecordingMethod(this.recordMode);
    }


    public render() {

        /**
         * This function is auotmatically called when the div containing the Recorder is mounted (using react's ref attribute).
         * it will initialize the recorder (which itself will initialize the keyboard events for recording) in 
         * addition to the record button that will turn green when recording.
         * @param elem points to the div containing the Recorder
         */
        const initRecorder = (elem: HTMLDivElement) => {
            this.recordBtn = d3.select("#record-btn");
        }

        /**
         * Updates the recorder with the newly set record method
         */
        const onRecordMethodChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
            let element = event.currentTarget;
            this.isRecording = false;
            switch (element.value) {
                case "PressAndHold":
                    this.SetRecordingMethod(RecordMode.PressAndHold);
                    break;

                case "PressToToggle":
                    this.SetRecordingMethod(RecordMode.PressToToggle);
                    break;
                default: break;
            }
        }

        const colossalStyle = { fontSize: "3.5rem", margin: "0" };

        return (
            <div ref={initRecorder} className="ui segments basic" >
                <div className="ui segment basic center aligned" >
                    <button id="record-btn" className="circular ui icon button" style={colossalStyle} >
                        <i className="icon record" > </i>
                    </button>
                </div>
                <div className="ui segment basic center aligned" >
                    <span className="ui text" > Record method: </span>
                    <br />
                    <select id="record-mode-select" className="ui dropdown" onChange={onRecordMethodChange} >
                        <option value="PressAndHold" > Press and Hold </option>
                        <option value="PressToToggle" > Press to Toggle </option>
                    </select>
                </div>
            </div>
        );
    }

}
