import * as React from "react";
import * as d3 from "d3";
import { RecorderButton } from "./recorder";
import { SignalPlot } from "./visualizations";
import { Gesture, GestureSample, Match } from "./gesture-data";
import { SingleDTWCore } from "./model";
import { RecognitionOverlay } from "./visualizations";
import { serialData, SerialData } from "./serial-data";


export interface GestureEditorProps {
    gesture: Gesture;
    model: SingleDTWCore;
    connected: boolean;
    onNewSampleRecorded: (gesture: Gesture, sample: GestureSample) => void;
}



export class GestureEditor extends React.Component<GestureEditorProps, {}> {
    private plotX: SignalPlot;
    private plotY: SignalPlot;
    private graphZ: SignalPlot;
    private graphInitialized: boolean;
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
        this.graphZ.update(newData.accVec.Z);
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
        this.graphInitialized = false;
    }



    public render() {

        /**
         * This function is auotmatically called when the div containing the Realtime Graph is mounted (using react's ref attribute).
         * It will instantiate all of the x, y, z graphs in addition to the green recognition overlay
         * to be triggered and visualized when a gesture is recognized.
         * @param elem points to the div containing the Realtime Graph 
         */
        const initGraph = (elem: HTMLDivElement) => {
            if (elem != null && !this.graphInitialized) {
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
                this.graphZ = new SignalPlot(svgZ_rt, width, height, maxVal, dx, "blue");

                this.recognitionOverlay = new RecognitionOverlay(
                    graph.select<SVGElement>("#recognition-overlay"), width, height, dx);

                this.graphInitialized = true;
            }
        }


        return (
            <div className="ui segment three column grid">
                <div className="nine wide column">
                    {
                        this.props.connected ?
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
        );
    }
}