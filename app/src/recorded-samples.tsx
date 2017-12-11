import * as React from "react";
import { GraphCard } from "./graphcard";
import { Gesture, GestureSample } from "./gesture-data";
import { SingleDTWCore } from "./model";


export interface RecordedSamplesProps {
    gesture: Gesture;
    model: SingleDTWCore;
    onDeleteHandler: (g: Gesture, s: GestureSample) => void,
}


export class RecordedSamples extends React.Component<RecordedSamplesProps, {}> {


    /**
     * Updates the scrollbar's horizontal position based on the width of the DisplayGesture on the left.
     * This function will make sure that the scrollbar would not get wider than the GestureToolbox container
     */
    private updateScrollbar() {
        // focus the scrollbar on the latest sample
        let scrollBarDiv = document.getElementById("gestures-fluid-container");
        scrollBarDiv.scrollLeft = scrollBarDiv.scrollWidth;

        // resize the scrollbar based on the window size:
        const recordedGestures = document.getElementById("recorded-samples");
        if (!recordedGestures) return;
        let totalWidth = recordedGestures.offsetWidth;
        const displayGestures = document.getElementById("display-gesture");
        if (!displayGestures) return;
        let dispGestureWidth = displayGestures.offsetWidth;
        let samplesContainerWidth = totalWidth - dispGestureWidth - 40;

        scrollBarDiv.style.width = samplesContainerWidth + "px";
    }


    public render() {
        const inputStyle = { height: "30px", padding: "auto auto auto 6px" };
        const headerStyle = { height: "60px" };
        const mainGraphStyle = { margin: "15px 15px 15px 0" };
        const sampleMarginStyle = { margin: "0 10px 10px 0" };

        /**
         * Updates the gesture name
         */
        const renameGesture = (event: any) => {
            // let cloneData = this.state.data.slice();
            this.props.gesture.name = event.target.value;
            this.props.model.UpdateName(this.props.gesture.name);

            // this.setState({ data: cloneData });
            // this.markDirty();
        }

        /**
         * this function is passed to an editable GraphCard component which contains a crop functionality
         * @param gid the unique gesture id of the gesture that contains the sample which is going to be deleted
         * @param sid the unique sample id which is going to be deleted
         * @param newStart the updated cropStartIndex
         * @param newEnd the updated cropEndIndex
         */
        const onSampleCrop = (sample: GestureSample, newStart: number, newEnd: number) => {
            // let gi = this.getGestureIndex(gid);
            // let si = this.getSampleIndex(gi, sid);

            // let cloneData = this.state.data.slice();

            // sample.cropStartIndex = newStart;
            // sample.cropEndIndex = newEnd;

            // this.props.model.Update(cloneData[gi].getCroppedData());
            // cloneData[gi].displayGesture = this.props.model.GetMainPrototype();

            // this.setState({ data: cloneData });
            // this.markDirty();
        }

        return (
            <div id="recorded-samples">
                <div className="ui segments" id="display-gesture">
                    <div className="ui segment inverted teal" style={headerStyle}>
                        <div className="ui action input left floated">
                            <input
                                style={inputStyle}
                                type="text"
                                ref="gesture-name-input"
                                value={this.props.gesture.name}
                                // onFocus={() => { this.recorder ? this.recorder.PauseEventListeners() : undefined; }}
                                // onBlur={() => { this.recorder ? this.recorder.ResumeEventListeners() : undefined }}
                                onChange={renameGesture}
                            />
                        </div>
                    </div>
                    <div className="ui segment">
                        <div className="ui grid">
                            {
                                this.props.gesture.samples.length == 0 ?
                                    undefined
                                    :
                                    <GraphCard
                                        key={this.props.gesture.displayGesture.sampleID}
                                        editable={false}
                                        gesture={this.props.gesture}
                                        sample={this.props.gesture.displayGesture}
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
                        this.props.gesture.samples.map(sample =>
                            <GraphCard
                                key={sample.sampleID}
                                editable={true}
                                gesture={this.props.gesture}
                                sample={sample}
                                dx={7}
                                graphHeight={80}
                                maxVal={2450}
                                onDeleteHandler={this.props.onDeleteHandler}
                                onCropHandler={(_, __, start, end) => onSampleCrop(sample, start, end)}
                                style={sampleMarginStyle}
                                ref={this.updateScrollbar}
                            />
                        )
                    }
                </div>
            </div>
        );
    }
}