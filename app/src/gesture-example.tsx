/// <reference path="../node_modules/@types/d3/index.d.ts"/>

import * as React from "react";
import { Gesture, GestureExampleData } from "./gesture-data";
import { observer } from "mobx-react";
import { MotionTimeline } from "./timeline";
import { observable } from "mobx";


export interface GestureExampleProps {
    editable: boolean;
    gesture: Gesture;
    example: GestureExampleData;
    dx: number;
    graphHeight: number;
    maxVal: number;
    onDeleteHandler?: (g: Gesture, s: GestureExampleData) => void,
    onCropHandler?: (g: Gesture, s: GestureExampleData, newStart: number, newEnd: number) => void,
    style?: any
}



@observer
export class GestureExample extends React.Component<GestureExampleProps, {}> {
    // TODO: get rid of these unnecessary global variables
    private parentData: Gesture[];
    private svgCrop: any;

    @observable editMode: boolean = false;

    constructor(props: GestureExampleProps) {
        super(props);
        this.handleDelete = this.handleDelete.bind(this);
        this.handleEdit = this.handleEdit.bind(this);
        this.handleSave = this.handleSave.bind(this);
    }

    getGestureIndex(gid: number): number {
        for (let i = 0; i < this.parentData.length; i++) {
            if (this.parentData[i].gestureID == gid) return i;
        }

        return -1;
    }

    getSampleIndex(gid: number, sid: number): number {
        for (let i = 0; i < this.parentData[gid].samples.length; i++) {
            if (this.parentData[gid].samples[i].sampleID == sid) return i;
        }

        return -1;
    }

    componentDidUpdate() {
        ($('.ui.embed') as any).embed();
    }

    handleDelete(e: any) {
        this.props.onDeleteHandler(this.props.gesture, this.props.example);
    }

    handleEdit(e: any) {
        this.editMode = true;
        // change UI into edit mode
        this.updateClipper(0, this.props.example.motion.length, true);
        this.svgCrop.transition().duration(150).delay(150).style("opacity", 1);
    }

    handleSave(e: any) {
        this.editMode = false;
        // onSampleChange handler (passed from parent) should be called.
        // the handler will change the state of itself (=parent)

        // re-render based on
        this.updateClipper(this.props.example.cropStartIndex, this.props.example.cropEndIndex + 1, true);
        this.svgCrop.style("opacity", 0);
        this.props.onCropHandler(this.props.gesture, this.props.example, this.props.example.cropStartIndex, this.props.example.cropEndIndex);
    }

    // on "edit" click 
    // setState -> editMode: true

    // on "delete" click 
    // parent.onSampleDeleteHandler(this) (or use the sampleID)
    // and then the parents state will get updated (as the shouldComponentUpdate will detect a change in the number of samples)

    // on "crop" event
    // parent.onSampleCropHandler(s, e);

    updateClipper(start: number, end: number, transition?: boolean) {
        return;
    }

    render() {
        const headerStyle = { height: "60px" };

        return (
            <div className="ui segments sample-graph" style={this.props.style}>
                {
                    this.props.editable == false ? undefined :
                        <div className="ui segment inverted" style={headerStyle}>
                            <div> {
                                this.editMode
                                    ?
                                    <button onClick={this.handleSave} className="ui violet icon button tiny compact left floated">
                                        <i className="checkmark icon" />
                                    </button>
                                    :
                                    <button onClick={this.handleEdit} className="ui icon button tiny compact left floated">
                                        <i className="crop icon" />
                                    </button>
                            }
                                <button onClick={this.handleDelete} className="ui icon black button tiny compact right floated">
                                    <i className="remove icon" />
                                </button>
                            </div>
                        </div>
                }
                <div style={{ position: 'relative', width: 200, height: 100 }}>
                    <MotionTimeline
                        readings={this.props.example.motion}
                        numReadingsToShow={this.props.example.motion.length}
                        width={200}
                        height={100}
                        hideStillMotion={false}
                    />
                </div>
            </div>
        );
    }
}
