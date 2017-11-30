import { Vector, GestureSample } from './types';
import * as Viz from './visualizations';

let nav = navigator as any;

export enum RecordMode {
    PressAndHold,
    PressToToggle
}

export class Recorder {
    private gestureIndex: number;
    private recordMode: RecordMode;
    private onRecordHandler: (gestureIndex: number, sample: GestureSample) => void;
    private enabled: boolean;
    private isRecording: boolean;
    private wasRecording: boolean;
    private sample: GestureSample;
    private recordBtn: any;
    private videoID: string;

    constructor(gestureIndex: number, recordMode: RecordMode, onNewSampleRecorded: (gestureIndex: number, sample: GestureSample) => void) {
        this.gestureIndex = gestureIndex;
        this.recordMode = recordMode;
        this.onRecordHandler = onNewSampleRecorded;

        this.SetRecordingMethod(recordMode);

        this.enabled = true;
        this.wasRecording = false;
        this.isRecording = false;
    }

    public initRecordButton(btnID: string) {
        this.recordBtn = Viz.d3.select("#" + btnID);
    }

    public Feed(yt: Vector) {
        if (this.enabled) {
            if (this.wasRecording == false && this.isRecording == true) {
                // start recording
                this.sample = new GestureSample();
                this.sample.startTime = Date.now();
                this.sample.rawData.push(yt);

                this.recordBtn.classed("green", true);
            } else if (this.wasRecording == true && this.isRecording == true) {
                // continue recording
                this.sample.rawData.push(yt);
            } else if (this.wasRecording == true && this.isRecording == false) {
                // stop recording
                this.sample.endTime = Date.now();
                this.sample.cropStartIndex = 0;
                this.sample.cropEndIndex = this.sample.rawData.length - 1;

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
        
        if (recordMode == RecordMode.PressAndHold) {
            // assign events to capture if recording or not
            window.onkeydown = (e: any) => {
                // if pressed "space" key
                if (e.keyCode == 32)
                    this.isRecording = true;
            };

            window.onkeyup = (e: any) => {
                // if released "space" key
                if (e.keyCode == 32)
                    this.isRecording = false;
            };
        } else if (recordMode == RecordMode.PressToToggle) {
            // assign events to capture if recording or not
            window.onkeydown = (e: any) => {
                // if pressed "space" key
                if (e.keyCode == 32 && this.isRecording == false)
                    this.isRecording = true;
                else if (e.keyCode == 32 && this.isRecording == true)
                    this.isRecording = false;
            };

            delete window.onkeyup;
        }
    }

    public PauseEventListeners() {
        delete window.onkeydown;
        delete window.onkeyup;
    }

    public ResumeEventListeners() {
        this.SetRecordingMethod(this.recordMode);
    }

}


export function parseString(strBuf: string): any {
    // populate members of newData (type: SensorData) with the values received from the device
    let strBufArray = strBuf.split(" ");
    let result = {acc: false, accVec: new Vector(0, 0, 0),
                  /*mag: false, magVec: new Vector(0, 0, 0)*/};

    for (let i = 0; i < strBufArray.length; i++) {
        if (strBufArray[i] == "A") {
            result.accVec = new Vector(parseInt(strBufArray[i + 1]), parseInt(strBufArray[i + 2]), parseInt(strBufArray[i + 3]));
            result.acc = true;

            i += 3;
        }
    }

    return result;
}