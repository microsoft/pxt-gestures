/// <reference path="../node_modules/pxt-core/built/pxteditor.d.ts"/>

import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Recorder from "./recorder";
import * as Types from "./types";
import * as Viz from "./visualizations";
import * as Model from "./model";
import { GraphCard } from "./graphcard";
import { Gesture } from "./types";

export const gesturesContainerID: string = "gestures-container";

// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func: (...args: any[]) => any, wait: number, immediate?: boolean): any {
    let timeout: any;
    return function () {
        let context = this
        let args = arguments;
        let later = function () {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        let callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}


interface GestureToolboxState {
    // show or hide the GestureToolbox
    visible?: boolean;
    // switch between the edit gesture mode and the main gesture view containing all of the recorded and imported gestures
    editGestureMode?: boolean;
    // contains all of the gesture data
    data?: Types.Gesture[];
    // is the Circuit Playground streaming accelerometer data or not
    connected?: boolean;
    // needs saving
    hasBeenModified?: boolean;
}

export interface IGestureSettingsProps {

}

export class GestureToolbox extends React.Component<IGestureSettingsProps, GestureToolboxState> {
    private extId: string;
    private idToType: pxt.Map<string>;
    private graphX: Viz.RealTimeGraph;
    private graphY: Viz.RealTimeGraph;
    private graphZ: Viz.RealTimeGraph;
    private recognitionOverlay: Viz.RecognitionOverlay;

    private graphInitialized: boolean;
    private recorderInitialized: boolean;

    private recorder: Recorder.Recorder;
    private curGestureIndex: number;
    private mainViewGesturesGraphsKey: number;

    private models: Model.SingleDTWCore[];

    private intervalID: NodeJS.Timer;
    private debouncedSaveBlocks: () => void;

    constructor(props: IGestureSettingsProps) {
        super(props);

        let data: Types.Gesture[] = [];
        this.extId = window.location.hash.substr(1);
        console.log(`extension id: ${this.extId}`)
        this.idToType = {};

        this.state = {
            visible: false,
            editGestureMode: false,
            data: data,
            connected: false,
            hasBeenModified: false
        };

        this.mainViewGesturesGraphsKey = 999;

        this.models = [];
        this.curGestureIndex = 0;

        this.graphInitialized = false;
        this.recorderInitialized = false;

        this.debouncedSaveBlocks = debounce(() => this.saveBlocks(), 2000);
    }

    sendRequest(action: string, body?: any) {
        const id = Math.random().toString();
        this.idToType[id] = action;
        const msg = {
            type: "pxtpkgext",
            action: action,
            extId: this.extId,
            response: true,
            id: id,
            body
        };
        if (window.parent && window != window.parent) window.parent.postMessage(msg, "*");
    }

    receiveMessage(data: pxt.editor.ExtensionMessage) {
        const ev = data as pxt.editor.ExtensionEvent;
        if (ev.event) {
            switch (ev.event) {
                case "extconsole":
                    const cons = ev as pxt.editor.ConsoleEvent;
                    // drop sim
                    if (cons.body.sim) return;
                    this.onSerialData(cons.body.data);
                    break;
                case "extshown":
                    console.log('pxt-gestures shown')
                    this.setState({ connected: false });
                    this.sendRequest("extdatastream");
                    this.sendRequest("extreadcode")
                    break;
                case "exthidden":
                    console.log('pxt-gestures hidden')
                    this.setState({ connected: false });
                    break;
                default:
                    break;
            }
            return;
        }

        const action = this.idToType[data.id];
        console.log(`msg: ${action}`)
        delete this.idToType[data.id];
        switch (action) {
            case "extinit":
                this.sendRequest("extdatastream");
                this.sendRequest("extreadcode");
                break;
            case "extreadcode":
                // received existing code
                const usercode = data as pxt.editor.ReadCodeResponse;
                this.loadBlocks(usercode.resp.code, usercode.resp.json);
                break;
            default: break;
        }
    }

    componentDidMount() {
        window.addEventListener("message", ev => ev.data.type == "pxtpkgext" ? this.receiveMessage(ev.data) : undefined, false);
        this.sendRequest("extinit");
    }

    /**
     * will generate the code blocks for each running DTW model and will rewrite 
     * the contents of the custom.ts file with 
     */
    saveBlocks() {
        if (!this.state.hasBeenModified) return;

        const codeBlocks: string[] = this.models
            .filter(m => m.isRunning())
            .map(m => m.GenerateBlock());
        const code = Model.SingleDTWCore.GenerateNamespace(codeBlocks);
        const json = JSON.stringify(this.state.data, null, 2);
        this.sendRequest("extwritecode", { code, json });
        this.setState({ hasBeenModified: false });
    }

    markDirty() {
        if (!this.state.hasBeenModified)
            this.setState({ hasBeenModified: true }, () => this.debouncedSaveBlocks());
    }

    loadBlocks(code: string, json: string) {
        if (!json) return;

        let gestures: Gesture[] = JSON.parse(json);
        if (!gestures) return;

        let cloneData = []; // this.state.data.slice();
        this.models = [];

        gestures.forEach(importedGesture => {
            let parsedGesture = new Gesture();
            parsedGesture.description = importedGesture.description;
            parsedGesture.name = importedGesture.name;
            parsedGesture.labelNumber = importedGesture.labelNumber;
            for (let j = 0; j < importedGesture.gestures.length; j++) {
                parsedGesture.gestures.push(this.parseJSONGesture(importedGesture.gestures[j]));
            }
            parsedGesture.displayGesture = this.parseJSONGesture(importedGesture.displayGesture);
            cloneData.push(parsedGesture);
            let curIndex = cloneData.length - 1;
            let newModel = new Model.SingleDTWCore(cloneData[curIndex].gestureID + 1, cloneData[curIndex].name);
            newModel.Update(cloneData[curIndex].getCroppedData());
            this.models.push(newModel);
        })
        this.setState({ data: cloneData });
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
        this.saveBlocks();

        this.setState({ visible: false, editGestureMode: false });
        this.resetGraph();

        this.deleteIfGestureEmpty();
    }


    show() {
        this.setState({ visible: true });
    }

    /**
     * Initializes the serial port (using hid for the Circuit Playground) and sets the onSerialData event function
     * to update the realtime graph, feed the recorder, and feed the realtime DTW model (if it is running)
     */
    onSerialData(strBuf: string) {
        const newData = Recorder.parseString(strBuf);

        if (newData && newData.acc && this.state.editGestureMode && this.graphZ && this.graphZ.isInitialized()) {
            this.graphX.update(newData.accVec.X);
            this.graphY.update(newData.accVec.Y);
            this.graphZ.update(newData.accVec.Z);

            if (this.recorder)
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

        if (!this.state.connected)
            this.setState({ connected: true });
    }

    /**
     * Sets the RealTimeGraph, and the Recorder uninitialized to make sure that they get initialized again when
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
     * Updates the scrollbar's horizontal position based on the width of the DisplayGesture on the left.
     * This function will make sure that the scrollbar would not get wider than the GestureToolbox container
     */
    updateScrollbar() {
        // focus the scrollbar on the latest sample
        let scrollBarDiv = document.getElementById("gestures-fluid-container");
        scrollBarDiv.scrollLeft = scrollBarDiv.scrollWidth;

        // resize the scrollbar based on the window size:
        const recordedGestures = document.getElementById("recorded-gestures");
        if (!recordedGestures) return;
        let totalWidth = recordedGestures.offsetWidth;
        const displayGestures = document.getElementById("display-gesture");
        if (!displayGestures) return;
        let dispGestureWidth = displayGestures.offsetWidth;
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
            this.saveBlocks();
            this.setState({ editGestureMode: false, data: cloneData });

            this.resetGraph();
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
            cloneData[gi].displayGesture = this.models[this.curGestureIndex].GetMainPrototype();

            this.setState({ data: cloneData });
            this.markDirty();
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
            cloneData[gi].displayGesture = this.models[this.curGestureIndex].GetMainPrototype();

            this.setState({ data: cloneData });
            this.markDirty();
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
                    cloneData[gestureIndex].displayGesture = this.models[this.curGestureIndex].GetMainPrototype();

                    this.setState({ data: cloneData });
                    this.markDirty();
                    this.updateScrollbar();
                }

                this.recorder = new Recorder.Recorder(this.curGestureIndex, Recorder.RecordMode.PressAndHold, onNewSampleRecorded);
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
                    if (this.recorder)
                        this.recorder.SetRecordingMethod(Recorder.RecordMode.PressAndHold);
                    break;

                case "PressToToggle":
                    if (this.recorder)
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

            this.setState({ data: cloneData });
            this.markDirty();
        }

        /**
         * Updates the gesture description
         */
        const renameDescription = (event: any) => {
            let cloneData = this.state.data.slice();
            cloneData[this.curGestureIndex].description = event.target.value;
            this.models[this.curGestureIndex].UpdateDescription(cloneData[this.curGestureIndex].description);

            this.setState({ data: cloneData });
            this.markDirty();
        }

        const inputStyle = { height: "30px", padding: "auto auto auto 6px" };
        const colossalStyle = { fontSize: "3.5rem", margin: "0" };
        const gestureContainerMargin = { margin: "0 15px 15px 0" };
        const sampleMarginStyle = { margin: "0 10px 10px 0" };
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
                    {this.state.hasBeenModified ? <span className="ui floated left">*</span> : undefined}
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
                                                            Steps to Download Streamer
                                            </div>
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
                                                <input style={inputStyle} type="text" ref="gesture-name-input" value={this.state.data[this.curGestureIndex].name} onFocus={() => { this.recorder ? this.recorder.PauseEventListeners() : undefined; }} onBlur={() => { this.recorder ? this.recorder.ResumeEventListeners() : undefined }} onChange={renameGesture} />
                                            </div>
                                        </div>
                                        <div className="ui segment">
                                            <div className="ui grid">
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