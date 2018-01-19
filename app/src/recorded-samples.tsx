import * as React from "react";
import { GestureExample } from "./gesture-example";
import { Gesture, GestureExampleData } from "./motion";
import { SingleDTWCore } from "./model";
import { observer } from "mobx-react";


export interface RecordedSamplesProps {
    gesture: Gesture;
    model: SingleDTWCore;
    onDeleteHandler: (g: Gesture, s: GestureExampleData) => void,
}


@observer
export class RecordedSamples extends React.Component<RecordedSamplesProps, {}> {


    public render() {
        return (
            <div id="recorded-samples">

                {/* <div className="ui items" id="display-gesture">
                    <div className="ui">
                        <div className="ui item">
                            {
                                this.props.gesture.samples.length == 0 ?
                                    undefined
                                    :
                                    <GestureExample
                                        key={this.props.gesture.displayGesture.sampleID}
                                        editable={false}
                                        gesture={this.props.gesture}
                                        example={this.props.gesture.displayGesture}
                                        dx={7}
                                        graphHeight={70}
                                        maxVal={2450}
                                        style={{ margin: "15px 15px 15px 0" }}
                                    />
                            }
                        </div>
                    </div>
                </div> */}

                <div className="header">Examples</div>
                <div className="ui items motion-examples">
                    {
                        this.props.gesture.samples.map(sample =>
                            <div className="ui item" key={sample.sampleID}>
                                <GestureExample
                                    editable={true}
                                    gesture={this.props.gesture}
                                    example={sample}
                                    dx={7}
                                    graphHeight={80}
                                    maxVal={2450}
                                    onDeleteHandler={this.props.onDeleteHandler}
                                    style={{ margin: "0 10px 10px 0" }}
                                />
                            </div>
                        )
                    }
                </div>
            </div>
        );
    }
}