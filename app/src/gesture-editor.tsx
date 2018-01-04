import * as React from "react";
import * as d3 from "d3";
import { RecorderButton } from "./recorder";
import { SignalPlot } from "./visualizations";
import { Gesture, GestureSample, Match } from "./gesture-data";
import { SingleDTWCore } from "./model";
import { RecognitionOverlay } from "./visualizations";
import { serialData, SerialData } from "./serial-data";
import { observer } from "mobx-react";
import { RecordedSamples } from "./recorded-samples";
import { gestureStore } from "./gesture-store";
import { DeviceOrientation } from "./orientation";


export interface GestureEditorProps {
    gesture: Gesture;
    model: SingleDTWCore;
    connected: boolean;
    onNewSampleRecorded: (gesture: Gesture, sample: GestureSample) => void;
    backToMain: () => void;
}


@observer
export class GestureEditor extends React.Component<GestureEditorProps, {}> {
    private plotX: SignalPlot;
    private plotY: SignalPlot;
    private plotZ: SignalPlot;
    private recognitionOverlay: RecognitionOverlay;


    constructor(props: GestureEditorProps) {
        super(props);
        this.onSerialData = this.onSerialData.bind(this);
        serialData.register(this.onSerialData)
    }

    private onSerialData(newData: SerialData) {
        if (!this.plotX) return;
        this.plotX.update(newData.accVec.X);
        this.plotY.update(newData.accVec.Y);
        this.plotZ.update(newData.accVec.Z);
    }

    public newMatch(match: Match) {
        if (match.classNum != 0) {
            // a gesture has been recognized - create the green rectangle overlay on the realtime graph
            this.recognitionOverlay.add(match, this.props.model.getTick());
        }
        this.recognitionOverlay.tick(this.props.model.getTick());

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
         * This function is auotmatically called when the div containing the Realtime Graph is mounted (using react's ref attribute).
         * It will instantiate all of the x, y, z graphs in addition to the green recognition overlay
         * to be triggered and visualized when a gesture is recognized.
         * @param elem points to the div containing the Realtime Graph 
         */
        const initGraph = (elem: HTMLDivElement) => {
            if (elem && !this.plotX) {
                // initialize SVG
                let graph = d3.select(elem);

                let svgX_rt = graph.select<SVGElement>("#realtime-graph-x");
                let svgY_rt = graph.select<SVGElement>("#realtime-graph-y");
                let svgZ_rt = graph.select<SVGElement>("#realtime-graph-z");

                let width = graph.node().offsetWidth - 2 * 16;
                let height = 75;
                let maxVal = 2450;
                let dx = 7;

                this.plotX = new SignalPlot(svgX_rt, width, height, maxVal, dx, "red");
                this.plotY = new SignalPlot(svgY_rt, width, height, maxVal, dx, "green");
                this.plotZ = new SignalPlot(svgZ_rt, width, height, maxVal, dx, "blue");

                this.recognitionOverlay = new RecognitionOverlay(
                    graph.select<SVGElement>("#recognition-overlay"), width, height, dx);
            }
        }

        /**
         * this function is passed to an editable GraphCard component which contains a delete button
         * @param gid the unique gesture id of the gesture that contains the sample which is going to be deleted
         * @param sid the unique sample id which is going to be deleted
         */
        const onSampleDelete = (gesture: Gesture, sample: GestureSample) => {
            gestureStore.deleteSample(gesture, sample);
        }

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
                                </div>
                        }
                    </div>

                    <DeviceOrientation />

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