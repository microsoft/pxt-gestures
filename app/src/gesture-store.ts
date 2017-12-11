import { Gesture, SignalReading, GestureSample } from "./gesture-data";
import { SingleDTWCore } from "./model";
import { serialData } from "./serial-data";



export class GestureStore {
    // contains all of the gesture data
    private data: Gesture[] = [];
    // is the Circuit Playground streaming accelerometer data or not
    public connected: boolean;
    // needs saving
    public hasBeenModified: boolean = false;
    private models: SingleDTWCore[] = [];
    private idToType: pxt.Map<string> = {};
    private extId: string;
    private curGestureIndex: number = 0;


    constructor() {
        this.extId = window.location.hash.substr(1);
        console.log(`extension id: ${this.extId}`)
        window.addEventListener(
            "message",
            ev => ev.data.type == "pxtpkgext" ? this.receiveMessage(ev.data) : undefined,
            false);
        this.sendRequest("extinit");
    }

    public get currentModel() {
        return this.models[this.curGestureIndex];
    }

    public get currentGesture() {
        return this.data[this.curGestureIndex];
    }

    public get gestures() {
        return this.data; // FIXME?
    }


    public setCurrentGesture(gestureId: number): void {
        this.curGestureIndex = this.data.findIndex(g => g.gestureID === gestureId);
    }


    public deleteSample(gesture: Gesture, sample: GestureSample) {
        let cloneData = this.data.slice();
        const gi = this.data.indexOf(gesture);
        const si = this.data[gi].samples.indexOf(sample);

        cloneData[gi].samples.splice(si, 1);
        const model = this.models[gesture.gestureID];
        model.Update(cloneData[gi].getCroppedData());
        cloneData[gi].displayGesture = model.GetMainPrototype();

        this.data = cloneData;
        this.markDirty();
    }

    public addSample(gesture: Gesture, newSample: GestureSample) {
        let cloneData = this.data.slice();
        const gestureIndex = this.data.indexOf(gesture);
        // do not change the order of the following lines:
        cloneData[gestureIndex].samples.push(newSample);
        gestureStore.currentModel.Update(cloneData[gestureIndex].getCroppedData());
        cloneData[gestureIndex].displayGesture = gestureStore.currentModel.GetMainPrototype();

        this.data = cloneData;
        this.markDirty();
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
                    this.connected = false;
                    this.sendRequest("extdatastream");
                    this.sendRequest("extreadcode")
                    break;
                case "exthidden":
                    console.log('pxt-gestures hidden')
                    this.connected = false;
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


    public sendRequest(action: string, body?: any) {
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
        if (window.parent && window != window.parent)
            window.parent.postMessage(msg, "*");
    }


    /**
     * Initializes the serial port (using hid for the Circuit Playground) and sets the onSerialData event function
     * to update the realtime graph, feed the recorder, and feed the realtime DTW model (if it is running)
     */
    onSerialData(strBuf: string) {
        const newData = parseString(strBuf);
        if (newData && newData.acc)
            serialData.notify(newData);

        this.connected = true;
    }



    /**
     * updates this.state.data[] array and the models[] array with a 
     * new Gesture and switches to the editGesture window
     */
    public addGesture() {
        this.data.push(new Gesture());
        // TODO: change this method of keeping the current gesture index to something more reliable
        this.curGestureIndex = this.data.length - 1;
        this.models.push(new SingleDTWCore(this.data[this.curGestureIndex].gestureID + 1, this.data[this.curGestureIndex].name));
    }


    /**
     * will generate the code blocks for each running DTW model and will rewrite 
     * the contents of the custom.ts file with 
     */
    public saveBlocks() {
        if (!this.hasBeenModified) return;
        let cloneData = this.data.slice();

        const codeBlocks: string[] = this.models
            .filter(m => m.isRunning())
            .map(m => m.GenerateBlock());
        const code = SingleDTWCore.GenerateNamespace(codeBlocks);
        const json = JSON.stringify(this.data, null, 2);
        this.sendRequest("extwritecode", { code, json });
        this.hasBeenModified = false;

        this.data = cloneData; // FIXME: Why did Majeed do this?
    }

    markDirty() {
        if (!this.hasBeenModified) {
            this.hasBeenModified = true;
            debounce(() => this.saveBlocks(), 2000);
        }
    }

    private loadBlocks(code: string, json: string) {
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
            if (!importedGesture.samples) importedGesture.samples = (<any>importedGesture).gestures; // name change
            for (let j = 0; j < importedGesture.samples.length; j++) {
                parsedGesture.samples.push(this.parseJSONGesture(importedGesture.samples[j]));
            }
            parsedGesture.displayGesture = this.parseJSONGesture(importedGesture.displayGesture);
            cloneData.push(parsedGesture);
            let curIndex = cloneData.length - 1;
            let newModel = new SingleDTWCore(cloneData[curIndex].gestureID + 1, cloneData[curIndex].name);
            newModel.Update(cloneData[curIndex].getCroppedData());
            this.models.push(newModel);
        })
        this.data = cloneData;
    }

    /**
     * Populates a GestureSample object with a given javascript object of a GestureSample and returns it.
     * @param importedSample the javascript object that contains a complete GestureSample (excpet the video data)
     */
    parseJSONGesture(importedSample: any): GestureSample {
        let sample = new GestureSample();

        for (let k = 0; k < importedSample.rawData.length; k++) {
            let vec = importedSample.rawData[k];
            sample.rawData.push(new SignalReading(vec.X, vec.Y, vec.Z));
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
        if (this.data.length > 0 && this.data[this.curGestureIndex].samples.length == 0) {
            // delete the gesture
            let cloneData = this.data.slice();
            cloneData.splice(this.curGestureIndex, 1);
            // delete the model
            this.models.splice(this.curGestureIndex, 1);
            this.data = cloneData;
        }
    }


}



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


function parseString(strBuf: string): any {
    // populate members of newData (type: SensorData) with the values received from the device
    let strBufArray = strBuf.split(" ");
    let result = {
        acc: false, accVec: new SignalReading(0, 0, 0),
        /*mag: false, magVec: new Vector(0, 0, 0)*/
    };

    for (let i = 0; i < strBufArray.length; i++) {
        if (strBufArray[i] == "A") {
            result.accVec = new SignalReading(parseInt(strBufArray[i + 1]), parseInt(strBufArray[i + 2]), parseInt(strBufArray[i + 3]));
            result.acc = true;

            i += 3;
        }
    }

    return result;
}


export const gestureStore = new GestureStore();
