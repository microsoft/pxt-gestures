import * as React from "react";
import { gestureStore } from "./gesture-store";
import { GestureExample } from "./gesture-example";
import { observer } from "mobx-react";
import { Gesture } from "./gesture-data";



export interface GestureGalleryProps {
    newGesture: () => void;
    editGesture: (gestureId: number) => void;
}


@observer
export class GestureGallery extends React.Component<GestureGalleryProps, {}> {
    constructor(props: GestureGalleryProps) {
        super(props);
        this.deleteGesture = this.deleteGesture.bind(this);
    }

    private deleteGesture(gesture: Gesture) {
        gestureStore.deleteGesture(gesture);
    }

    public render() {
        return (
            <div className="ui grid" style={{ padding: '10px' }}>

                <div className="ui row left floated">
                    <div className="ui buttons">
                        <button className="ui button" onClick={this.props.newGesture} >
                            <p>New Gesture <i className="add circle icon"></i></p>
                        </button>
                    </div>
                </div>

                <div className="ui link row" >
                    <div className="ui cards">
                        {
                            gestureStore.gestures.map(gesture =>
                                <div
                                    className="ui card"
                                    key={gesture.gestureID}
                                >
                                    <div className="content">
                                        <a
                                            className="header left floated gesture-name-gallery"
                                            onClick={() => { this.props.editGesture(gesture.gestureID) }}
                                        >
                                            {gesture.name}
                                        </a>

                                        <button
                                            onClick={e => {
                                                ($('#delete-gesture') as any).modal('show');
                                                e.stopPropagation();
                                            }}
                                            className="ui icon button clear right floated aligned top"
                                        >
                                            <i className="trash icon" />
                                        </button>
                                        <div className="ui mini modal" id="delete-gesture">
                                            <div className="header">Delete Gesture</div>
                                            <div className="content">
                                                <p> Are you sure you want to delete the gesture "{gesture.name}"?</p>
                                            </div>
                                            <div className="actions">
                                                <div className="ui button cancel">No</div>
                                                <div className="ui button ok" onClick={() => this.deleteGesture(gesture)}>Yes</div>
                                            </div>
                                        </div>
                                    </div>

                                    <GestureExample
                                        key={gesture.gestureID}
                                        editable={false}
                                        gesture={gesture}
                                        example={gesture.displayGesture}
                                        dx={7}
                                        graphHeight={70}
                                        maxVal={2450}
                                        style={{ margin: "15px 15px 15px 0" }}
                                    />

                                </div>
                            )
                        }
                    </div>
                </div>
            </div>
        );
    }
}