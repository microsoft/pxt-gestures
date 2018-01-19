/// <reference path="../node_modules/@types/d3/index.d.ts"/>

import * as React from "react";
import { Gesture, GestureExampleData } from "./motion";
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
        return (
            <div className="ui row motion-example" style={this.props.style}>
                <div style={{ position: 'relative', width: 200, height: 100, display: 'inline-block' }}>
                    <MotionTimeline
                        readings={this.props.example.motion}
                        isMatch={t => false}
                        numReadingsToShow={this.props.example.motion.length}
                        width={200}
                        height={100}
                        hideStillMotion={false}
                    />
                </div>
                {
                    this.props.editable
                        ?
                        <button
                            onClick={this.handleDelete} 
                            className="ui clear icon button float right"
                            style={{ verticalAlign: 'top' }}
                        >
                            <i className="remove icon" />
                        </button>
                        :
                        undefined
                }
            </div>
        );
    }
}
