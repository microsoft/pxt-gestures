import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Recorder from "./recorder";
import * as Types from "./types";
import * as Viz from "./visualizations";
import * as Model from "./model";
import { GraphCard } from "./graphcard";

export const gesturesContainerID: string = "gestures-container";

interface GestureToolboxState {
    // show or hide the GestureToolbox
    visible?: boolean;
    // switch between the edit gesture mode and the main gesture view containing all of the recorded and imported gestures
    editGestureMode?: boolean;
    // contains all of the gesture data
    data?: Types.Gesture[];
    // is the Circuit Playground streaming accelerometer data or not
    connected?: boolean;
}

export interface IGestureSettingsProps {

}

export class GestureToolbox extends React.Component<IGestureSettingsProps, GestureToolboxState> {
    private graphX: Viz.RealTimeGraph;
    private graphY: Viz.RealTimeGraph;
    private graphZ: Viz.RealTimeGraph;
    private recognitionOverlay: Viz.RecognitionOverlay;

    private graphInitialized: boolean;
    private recorderInitialized: boolean;
    private hasBeenModified: boolean;

    private recorder: Recorder.Recorder;
    private curGestureIndex: number;
    private mainViewGesturesGraphsKey: number;

    private models: Model.SingleDTWCore[];

    private lastConnectedTime: number;
    private intervalID: NodeJS.Timer;

    constructor(props: IGestureSettingsProps) {
        super(props);

        let data: Types.Gesture[] = [];

        this.state = {
            visible: false,
            editGestureMode: false,
            data: data,
            connected: false
        };

        this.mainViewGesturesGraphsKey = 999;
        this.lastConnectedTime = 0;

        this.models = [];
        this.curGestureIndex = 0;

        this.graphInitialized = false;
        this.recorderInitialized = false;
        this.hasBeenModified = false;
    }

    /**
     * will generate the code blocks for each running DTW model and will rewrite 
     * the contents of the custom.ts file with 
     */
    generateBlocks() {
        let codeBlocks: string[] = [];

        for (let i = 0; i < this.models.length; i++) {
            if (this.models[i].isRunning())
                codeBlocks.push(this.models[i].GenerateBlock());
        }

        // TODOX: send code back to editor this.props.parent.updateFileAsync("custom.ts", Model.SingleDTWCore.GenerateNamespace(codeBlocks));

        this.hasBeenModified = false;
    }

    /**
     * Removes the currently active gesture if it contains no samples
     */
    deleteIfGestureEmpty() {
        if (this.state.data.length > 0 && this.state.data[this.curGestureIndex].gestures.length == 0) {
            // delete the gesture
            let cloneData = this.state.data.slice();
            cloneData.splice(this.curGestureIndex, 1);
            // delete the model
            this.models.splice(this.curGestureIndex, 1);
            this.setState({ data: cloneData });
        }
    }

    hide() {
        // generates the blocks and reloads the workspace to make them available instantly 
        // though it will not reload if there were no changes to any of the gestures
        if (this.hasBeenModified) this.generateBlocks();

        this.setState({ visible: false, editGestureMode: false });
        this.resetGraph();

        if (this.state.editGestureMode)
            this.recorder.PauseWebcam();

        this.deleteIfGestureEmpty();
    }


    show() {
        this.setState({ visible: true });
    }

    /**
     * Initializes the serial port (using hid for the Circuit Playground) and sets the onSerialData event function
     * to update the realtime graph, feed the recorder, and feed the realtime DTW model (if it is running)
     */
    connectToDevice() {
        const onSerialData = (buf: any, isErr: any) => {
            let strBuf: string = ""// TODOX //Util.fromUTF8(Util.uint8ArrayToString(buf));
            let newData = Recorder.parseString(strBuf);

            // make sure that the input stream of data is correct (contains accelerometer data)
            if (newData.acc)
                this.lastConnectedTime = Date.now();

            if (this.state.editGestureMode && this.state.connected) {
                if (newData.acc && this.graphZ.isInitialized()) {
                    this.graphX.update(newData.accVec.X);
                    this.graphY.update(newData.accVec.Y);
                    this.graphZ.update(newData.accVec.Z);

                    this.recorder.Feed(newData.accVec);

                    if (this.models[this.curGestureIndex].isRunning()) {
                        let match = this.models[this.curGestureIndex].Feed(newData.accVec);
                        if (match.classNum != 0) {
                            // a gesture has been recognized - create the green rectangle overlay on the realtime graph
                            this.recognitionOverlay.add(match, this.models[this.curGestureIndex].getTick());
                        }
                        this.recognitionOverlay.tick(this.models[this.curGestureIndex].getTick());
                    }
                }
            }
        };

        // TODOX: hook to serial dat
    }

    /**
     * Sets the RealTimeGraph, Webcam, and the Recorder uninitialized to make sure that they get initialized again when
     * editing a gesture or creating a new gesture when changing the component's state back to {editGesture: true}
     */
    resetGraph() {
        this.graphInitialized = false;
        this.recorderInitialized = false;
    }

    /**
     * returns the gesture index within the state.data[] array based on the unique gesture id.
     * @param gid the unique gesture id assigned automatically when instantiating a new gesture
     */
    getGestureIndex(gid: number): number {
        for (let i = 0; i < this.state.data.length; i++) {
            if (this.state.data[i].gestureID == gid) return i;
        }

        return -1;
    }

    /**
     * returns the gesture index within the state.data[] array based on the unique gesture id.
     * @param gid the unique gesture id assigned automatically when instantiating a new gesture
     * @param sid the unique sample id assigned automatically when instantiating a new sample
     */
    getSampleIndex(gid: number, sid: number): number {
        for (let i = 0; i < this.state.data[gid].gestures.length; i++) {
            if (this.state.data[gid].gestures[i].sampleID == sid) return i;
        }

        return -1;
    }

    /**
     * Populates a GestureSample object with a given javascript object of a GestureSample and returns it.
     * @param importedSample the javascript object that contains a complete GestureSample (excpet the video data)
     */
    parseJSONGesture(importedSample: any): Types.GestureSample {
        let sample = new Types.GestureSample();

        for (let k = 0; k < importedSample.rawData.length; k++) {
            let vec = importedSample.rawData[k];
            sample.rawData.push(new Types.Vector(vec.X, vec.Y, vec.Z));
        }

        sample.videoLink = importedSample.videoLink;
        sample.videoData = importedSample.videoData;
        sample.startTime = importedSample.startTime;
        sample.endTime = importedSample.endTime;
        sample.cropStartIndex = importedSample.cropStartIndex;
        sample.cropEndIndex = importedSample.cropEndIndex;

        return sample;
    }

    /**
     * Updates the scrollbar's horizontal position based on the width of the DisplayGesture on the left.
     * This function will make sure that the scrollbar would not get wider than the GestureToolbox container
     */
    updateScrollbar() {
        // focus the scrollbar on the latest sample
        let scrollBarDiv = document.getElementById("gestures-fluid-container");
        scrollBarDiv.scrollLeft = scrollBarDiv.scrollWidth;

        // resize the scrollbar based on the window size:
        let totalWidth = document.getElementById("recorded-gestures").offsetWidth;
        let dispGestureWidth = document.getElementById("display-gesture").offsetWidth;
        let samplesContainerWidth = totalWidth - dispGestureWidth - 40;

        scrollBarDiv.style.width = samplesContainerWidth.toString() + "px";
    }

    render() {
        /**
         * returns from the editGesture window to the main window and 
         * generates the gesture blocks if they have been modified
         */
        const backToMain = () => {
            let cloneData = this.state.data.slice();
            // update name
            cloneData[this.curGestureIndex].name = (ReactDOM.findDOMNode(this.refs["gesture-name-input"]) as HTMLInputElement).value;
            // update blocks if was touched
            if (this.hasBeenModified) this.generateBlocks();
            this.setState({ editGestureMode: false, data: cloneData });

            this.resetGraph();
            this.recorder.PauseWebcam();
            this.deleteIfGestureEmpty();
        }

        /**
         * updates this.state.data[] array and the models[] array with a 
         * new Gesture and switches to the editGesture window
         */
        const newGesture = () => {
            this.setState({ editGestureMode: true });
            this.resetGraph();
            this.state.data.push(new Types.Gesture());
            // TODO: change this method of keeping the current gesture index to something more reliable
            this.curGestureIndex = this.state.data.length - 1;
            this.models.push(new Model.SingleDTWCore(this.state.data[this.curGestureIndex].gestureID + 1, this.state.data[this.curGestureIndex].name));
        }

        /**
         * sets the current active gesture with the given gesture id and 
         * switches to the editGesture window
         * @param gestureID the unique gesture id to switch to
         */
        const editGesture = (gestureID: number) => {
            this.setState({ editGestureMode: true });
            this.resetGraph();
            this.curGestureIndex = this.getGestureIndex(gestureID);
        }

        /**
         * this function is passed to an editable GraphCard component which contains a delete button
         * @param gid the unique gesture id of the gesture that contains the sample which is going to be deleted
         * @param sid the unique sample id which is going to be deleted
         */
        const onSampleDelete = (gid: number, sid: number) => {
            let gi = this.getGestureIndex(gid);
            let si = this.getSampleIndex(gi, sid);

            let cloneData = this.state.data.slice();

            cloneData[gi].gestures.splice(si, 1);
            this.models[this.curGestureIndex].Update(cloneData[gi].getCroppedData());
            this.hasBeenModified = true;
            cloneData[gi].displayGesture = this.models[this.curGestureIndex].GetMainPrototype();

            this.setState({ data: cloneData });
        }

        /**
         * this function is passed to an editable GraphCard component which contains a crop functionality
         * @param gid the unique gesture id of the gesture that contains the sample which is going to be deleted
         * @param sid the unique sample id which is going to be deleted
         * @param newStart the updated cropStartIndex
         * @param newEnd the updated cropEndIndex
         */
        const onSampleCrop = (gid: number, sid: number, newStart: number, newEnd: number) => {
            let gi = this.getGestureIndex(gid);
            let si = this.getSampleIndex(gi, sid);

            let cloneData = this.state.data.slice();

            cloneData[gi].gestures[si].cropStartIndex = newStart;
            cloneData[gi].gestures[si].cropEndIndex = newEnd;

            this.models[this.curGestureIndex].Update(cloneData[gi].getCroppedData());
            this.hasBeenModified = true;
            cloneData[gi].displayGesture = this.models[this.curGestureIndex].GetMainPrototype();

            this.setState({ data: cloneData });
        }

        /**
         * This function is auotmatically called when the div containing the Realtime Graph is mounted (using react's ref attribute).
         * It will instantiate all of the x, y, z graphs in addition to the green recognition overlay
         * to be triggered and visualized when a gesture is recognized.
         * @param elem points to the div containing the Realtime Graph 
         */
        const initGraph = (elem: any) => {
            if (elem != null && !this.graphInitialized) {
                // initialize SVG
                let graph = Viz.d3.select(elem);

                let svgX_rt = graph.select("#realtime-graph-x");
                let svgY_rt = graph.select("#realtime-graph-y");
                let svgZ_rt = graph.select("#realtime-graph-z");

                let width = graph.node().offsetWidth - 2 * 16;
                let height = 75;
                let maxVal = 2450;
                let dx = 7;

                this.graphX = new Viz.RealTimeGraph(svgX_rt, width, height, maxVal, dx, "red");
                this.graphY = new Viz.RealTimeGraph(svgY_rt, width, height, maxVal, dx, "green");
                this.graphZ = new Viz.RealTimeGraph(svgZ_rt, width, height, maxVal, dx, "blue");

                this.recognitionOverlay = new Viz.RecognitionOverlay(graph.select("#recognition-overlay"), width, height, dx);

                this.graphInitialized = true;
            }
        }

        /**
         * This function is auotmatically called when the div containing the Recorder is mounted (using react's ref attribute).
         * it will initialize the recorder (which itself will initialize the keyboard events for recording) in 
         * addition to the record button that will turn green when recording.
         * @param elem points to the div containing the Recorder
         */
        const initRecorder = (elem: any) => {
            if (elem != null && !this.recorderInitialized) {
                /**
                 * This function is passed to the recorder to be called when a new gesture was recorded.
                 * It will be called when the media stream recorder has finished generating the recorded video.
                 * It will then update the this.state.data[] array, regenerate the DTW model, and update the scrollbar.
                 */
                const onNewSampleRecorded = (gestureIndex: number, newSample: Types.GestureSample) => {

                    let cloneData = this.state.data.slice();
                    // do not change the order of the following lines:
                    cloneData[gestureIndex].gestures.push(newSample);
                    this.models[this.curGestureIndex].Update(cloneData[gestureIndex].getCroppedData());
                    this.hasBeenModified = true;
                    cloneData[gestureIndex].displayGesture = this.models[this.curGestureIndex].GetMainPrototype();
                    // Currently, it will set the DisplayGesture.video to the *first* recorded video for that gesture
                    // TODO: allow users to change the display video in the future.
                    if (this.state.data[gestureIndex].gestures.length == 1) {
                        // update video
                        cloneData[gestureIndex].displayVideoLink = cloneData[gestureIndex].gestures[0].videoLink;
                        cloneData[gestureIndex].displayVideoData = cloneData[gestureIndex].gestures[0].videoData;
                    }

                    this.setState({ data: cloneData });
                    this.updateScrollbar();
                }

                this.recorder = new Recorder.Recorder(this.curGestureIndex, Recorder.RecordMode.PressAndHold, onNewSampleRecorded);
                this.recorder.initWebcam("webcam-video");
                this.recorder.initRecordButton("record-btn");
                this.recorderInitialized = true;
            }
        }

        /**
         * Updates the recorder with the newly set record method
         */
        const onRecordMethodChange = (event: any) => {
            let element = document.getElementById("record-mode-select") as HTMLSelectElement;

            switch (element.value) {
                case "PressAndHold":
                    this.recorder.SetRecordingMethod(Recorder.RecordMode.PressAndHold);
                    break;

                case "PressToToggle":
                    this.recorder.SetRecordingMethod(Recorder.RecordMode.PressToToggle);
                    break;
                default: break;
            }
        }

        /**
         * Updates the gesture name
         */
        const renameGesture = (event: any) => {
            let cloneData = this.state.data.slice();
            cloneData[this.curGestureIndex].name = event.target.value;
            this.models[this.curGestureIndex].UpdateName(cloneData[this.curGestureIndex].name);
            this.hasBeenModified = true;

            this.setState({ data: cloneData });
        }

        /**
         * Updates the gesture description
         */
        const renameDescription = (event: any) => {
            let cloneData = this.state.data.slice();
            cloneData[this.curGestureIndex].description = event.target.value;
            this.models[this.curGestureIndex].UpdateDescription(cloneData[this.curGestureIndex].description);
            this.hasBeenModified = true;

            this.setState({ data: cloneData });
        }

        /**
         * Uploads the streamer code
         * TODO: update this to modify main.ts with streamer code, and then upload it to the device
         * instead of requiring unix cmd copy/paste mechanism of a pre-generated streamer.uf2 file.
         */
        const uploadStreamerCode = () => {
            // TODOX
        }

        const inputStyle = { height: "30px", padding: "auto auto auto 6px" };
        const colossalStyle = { fontSize: "3.5rem", margin: "0" };
        const gestureContainerMargin = { margin: "0 15px 15px 0" };
        const sampleMarginStyle = { margin: "0 10px 10px 0" };
        const headerStyle = { height: "60px" };
        const buttonHeightStyle = { height: "30px" };
        const mainGraphStyle = { margin: "15px 15px 15px 0" };

        return (
            <div className="ui container">
                <div className="ui segment">
                    {this.state.editGestureMode
                        ?
                        <button className="ui button icon huge clear" id="back-btn" onClick={() => backToMain()}>
                            <i className="icon chevron left large"></i>
                        </button>
                        :
                        <span className="ui header">Gesture Toolbox</span>
                    }
                </div>
                <div className="ui segment bottom attached tab active tabsegment">
                    {
                        this.state.editGestureMode == false ?
                            <div className="ui">
                                <div className="ui buttons">
                                    <button className="ui button primary" onClick={() => newGesture()}>
                                        New Gesture...
                                    </button>
                                </div>
                                <div className="ui divider"></div>
                                {
                                    this.state.data.length == 0 ? undefined :
                                        <div>
                                            {
                                                this.state.data.map((gesture) =>
                                                    <div className="ui segments link-effect gesture-container" key={this.mainViewGesturesGraphsKey++} style={gestureContainerMargin}>
                                                        <div className="ui segment inverted teal" style={headerStyle}>
                                                            <div className="ui header inverted left floated">
                                                                {gesture.name}
                                                            </div>
                                                            <button className="ui icon button purple inverted compact tiny right floated" onClick={() => { editGesture(gesture.gestureID) }}>
                                                                Edit Gesture
                                                </button>
                                                        </div>
                                                        <div className="ui segment">
                                                            <div className="ui grid">
                                                                <video className="flipped-video gesture-video" src={gesture.displayVideoLink} autoPlay={true} loop={true}></video>
                                                                <GraphCard
                                                                    key={gesture.gestureID}
                                                                    editable={false}
                                                                    parent={this}
                                                                    data={gesture.displayGesture}
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
                                }
                            </div>
                            :
                            <div>
                                <div className="ui segment three column grid">
                                    <div className="four wide column">
                                        {
                                            this.state.connected ?
                                                <video id="webcam-video" className="flipped-video"></video>
                                                :
                                                undefined
                                        }
                                    </div>
                                    <div className="nine wide column">
                                        {
                                            this.state.connected ?
                                                <div>
                                                    <div ref={initGraph}>
                                                        <svg className="row" id="realtime-graph-x"></svg>
                                                        <svg className="row" id="realtime-graph-y"></svg>
                                                        <svg className="row" id="realtime-graph-z"></svg>
                                                        <svg id="recognition-overlay"></svg>
                                                    </div>
                                                </div>
                                                :
                                                <div className="ui message">
                                                    <div className="content">
                                                        <div className="header">
                                                            Steps to Program Streamer
                                            </div>
                                                        <ul className="list">
                                                            <li>Make sure that the Circuit Playground Express is connected to your computer</li>
                                                            <li>Set the device to <em>Program Mode</em> (all of the neopixel lights should turn green)</li>
                                                            <li>Upload the <em>streamer.uf2</em> program to the device by dragging it into the device's removable drive</li>
                                                        </ul>
                                                        <br />
                                                        <button id="program-streamer-btn" className="ui button compact icon-and-text primary download-button big" onClick={uploadStreamerCode}>
                                                            <i className="download icon icon-and-text"></i>
                                                            <span className="ui text">Program Streamer</span>
                                                        </button>
                                                    </div>
                                                </div>

                                        }
                                    </div>
                                    <div className="three wide column">
                                        {
                                            this.state.connected ?
                                                <div ref={initRecorder} className="ui segments basic">
                                                    <div className="ui segment basic center aligned">
                                                        <button id="record-btn" className="circular ui icon button" style={colossalStyle}>
                                                            <i className="icon record"></i>
                                                        </button>
                                                    </div>
                                                    <div className="ui segment basic center aligned">
                                                        <span className="ui text">Record method:</span>
                                                        <br />
                                                        <select id="record-mode-select" className="ui dropdown" onChange={onRecordMethodChange}>
                                                            <option value="PressAndHold">Press &amp; Hold</option>
                                                            <option value="PressToToggle">Press to Toggle</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                :
                                                undefined
                                        }
                                    </div>
                                </div>
                                <div id="recorded-gestures">
                                    <div className="ui segments" id="display-gesture">
                                        <div className="ui segment inverted teal" style={headerStyle}>
                                            <div className="ui action input left floated">
                                                <input style={inputStyle} type="text" ref="gesture-name-input" value={this.state.data[this.curGestureIndex].name} onFocus={() => { this.recorder.PauseEventListeners(); }} onBlur={() => { this.recorder.ResumeEventListeners(); }} onChange={renameGesture} />
                                                <button className="ui icon button compact tiny" style={buttonHeightStyle}>
                                                    <i className="save icon" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="ui segment">
                                            <div className="ui grid">
                                                {
                                                    this.state.data[this.curGestureIndex].gestures.length == 0 ?
                                                        <video className="flipped-video gesture-video" src="" autoPlay={true} loop={true}></video>
                                                        :
                                                        <video className="flipped-video gesture-video" src={this.state.data[this.curGestureIndex].displayVideoLink} autoPlay={true} loop={true}></video>
                                                }
                                                {
                                                    this.state.data[this.curGestureIndex].gestures.length == 0 ?
                                                        undefined
                                                        :
                                                        <GraphCard
                                                            key={this.state.data[this.curGestureIndex].displayGesture.sampleID}
                                                            editable={false}
                                                            parent={this}
                                                            data={this.state.data[this.curGestureIndex].displayGesture}
                                                            dx={7}
                                                            graphHeight={70}
                                                            maxVal={2450}
                                                            style={mainGraphStyle}
                                                        />
                                                }
                                            </div>
                                        </div>
                                    </div>
                                    <div id="gestures-fluid-container">
                                        {
                                            this.state.data[this.curGestureIndex].gestures.map((sample) =>
                                                <GraphCard
                                                    key={sample.sampleID}
                                                    editable={true}
                                                    parent={this}
                                                    gestureID={this.state.data[this.curGestureIndex].gestureID}
                                                    sampleID={sample.sampleID}
                                                    dx={7}
                                                    graphHeight={80}
                                                    maxVal={2450}
                                                    onDeleteHandler={onSampleDelete}
                                                    onCropHandler={onSampleCrop}
                                                    style={sampleMarginStyle}
                                                    ref={this.updateScrollbar}
                                                />
                                            )
                                        }
                                    </div>
                                </div>
                            </div>
                    }
                </div>
            </div>
        )
    }
}