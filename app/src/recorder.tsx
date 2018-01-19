import * as React from 'react';
import { MotionReading, GestureExampleData, Gesture } from './motion';
import { serialData, SerialData } from './serial-data';
import { observer } from 'mobx-react';
import { observable } from 'mobx';


export enum RecordMode {
    PressAndHold,
    PressToToggle
}

export interface RecorderButtonProps {
    gesture: Gesture;
    onNewSampleRecorded: (gesture: Gesture, sample: GestureExampleData) => void;
}

const SPACEBAR = 32;
const ENTER = 13;

@observer
export class RecorderButton extends React.Component<RecorderButtonProps, {}> {
    private recordMode = RecordMode.PressAndHold;
    private enabled: boolean;
    @observable private isRecording: boolean;
    private wasRecording: boolean;
    private sample: GestureExampleData;
    private triggerKey = SPACEBAR;

    constructor(props: RecorderButtonProps) {
        super(props);
        this.enabled = true;
        this.wasRecording = false;
        this.isRecording = false;
        this.onSerialData = this.onSerialData.bind(this);
        this.onKeyChange = this.onKeyChange.bind(this);
        this.onRecordMethodChange = this.onRecordMethodChange.bind(this);
        serialData.register(this.onSerialData);
    }

    componentDidMount() {
        this.setRecordingMethod(this.recordMode);
        ($('#key-selection') as any).dropdown({
            onChange: this.onKeyChange
        });
        ($('#recording-method') as any).dropdown({
            onChange: this.onRecordMethodChange
        });
    }

    private onSerialData(newData: SerialData) {
        this.feed(newData.accVec);
    }

    public feed(yt: MotionReading) {
        if (this.enabled) {
            if (!this.wasRecording && this.isRecording) {
                // start recording
                this.sample = new GestureExampleData();
                this.sample.startTime = Date.now();
                this.sample.motion.push(yt);
            } else if (this.wasRecording && this.isRecording) {
                // continue recording
                this.sample.motion.push(yt);
            } else if (this.wasRecording && !this.isRecording) {
                // stop recording
                this.sample.endTime = Date.now();
                this.sample.cropStartIndex = 0;
                this.sample.cropEndIndex = this.sample.motion.length - 1;
                this.props.onNewSampleRecorded(this.props.gesture, this.sample);
            }

            this.wasRecording = this.isRecording;
        }
    }

    public disable() {
        this.enabled = false;
    }

    public setRecordingMethod(recordMode: RecordMode) {
        this.recordMode = recordMode;

        const forMe = () => document.activeElement.tagName.toLowerCase() !== 'input';

        if (recordMode == RecordMode.PressAndHold) {
            // assign events to capture if recording or not
            document.onkeydown = (e: any) => {
                // if pressed "space" key
                if (forMe() && e.keyCode == this.triggerKey) {
                    this.isRecording = true;
                }
            };

            document.onkeyup = (e: any) => {
                // if released "space" key
                if (forMe() && e.keyCode == this.triggerKey) {
                    this.isRecording = false;
                }
            };
        } else if (recordMode == RecordMode.PressToToggle) {
            // assign events to capture if recording or not
            document.onkeydown = (e: any) => {
                // if pressed "space" key
                if (forMe() && e.keyCode == this.triggerKey) {
                    this.isRecording = !this.isRecording;
                }
            };

            delete document.onkeyup;
        }
    }

    public pauseEventListeners() {
        delete window.onkeydown;
        delete window.onkeyup;
    }

    public resumeEventListeners() {
        this.setRecordingMethod(this.recordMode);
    }

    private onRecordMethodChange(value: string, text: string) {
        this.isRecording = false;
        switch (value) {
            case "held down":
                this.setRecordingMethod(RecordMode.PressAndHold);
                break;

            case "toggled":
                this.setRecordingMethod(RecordMode.PressToToggle);
                break;
            default: break;
        }
    }

    private onKeyChange(value: string, text: string) {
        switch (value) {
            case "Enter": this.triggerKey = ENTER; break;
            case "spacebar": this.triggerKey = SPACEBAR; break;
            default: break;
        }
    }


    public render() {
        return (
            <div className="ui content">
                <button id="record-btn" className={"circular ui icon button" + (this.isRecording ? " green" : "")}  >
                    <i className="icon record" > </i>
                </button>
                Record a gesture when the&nbsp;
                <div id='key-selection' className="ui inline dropdown">
                    <div className="text"> spacebar </div>
                    <i className="dropdown icon"></i>
                    <div className="menu">
                        <div className="active item" data-text="spacebar"> Spacebar </div>
                        <div className="item" data-text="Enter"> Enter </div>
                    </div>
                </div>
                key is&nbsp;
                <div id='recording-method' className="ui inline dropdown">
                    <div className="text">held down</div>
                    <i className="dropdown icon"></i>
                    <div className="menu">
                        <div className="active item" data-text="held down"> Held Down </div>
                        <div className="item" data-text="toggled"> Toggled </div>
                    </div>
                </div>
            </div>
        );
    }

}
