import * as React from "react";
import { gestureStore } from "./gesture-store";
import { GraphCard } from "./graphcard";
import { observer } from "mobx-react";



export interface GestureGalleryProps {
    newGesture: () => void;
    editGesture: (gestureId: number) => void;
}


@observer
export class GestureGallery extends React.Component<GestureGalleryProps, {}> {
    public render() {
        const gestureContainerMargin = { margin: "0 15px 15px 0" };
        const headerStyle = { height: "60px" };
        const mainGraphStyle = { margin: "15px 15px 15px 0" };


        return (
            <div className="ui" >
                <div className="ui buttons" >
                    <button className="ui button primary" onClick={this.props.newGesture} >
                        New Gesture...
                    </button>
                </div>
                <div className="ui divider" > </div>
                {
                    gestureStore.gestures.map(gesture =>
                        <div
                            className="ui segments link-effect gesture-container"
                            key={gesture.gestureID}
                            style={gestureContainerMargin}
                        >
                            <div className="ui teal" style={headerStyle} >
                                <div className="ui header left floated" >
                                    {gesture.name}
                                </div>
                                <button
                                    className="ui icon button purple inverted compact tiny right floated"
                                    onClick={() => { this.props.editGesture(gesture.gestureID) }}
                                >
                                    Edit Gesture
                                </button>
                            </div>
                            <div className="ui segment" >
                                <div className="ui grid" >
                                    <GraphCard
                                        key={gesture.gestureID}
                                        editable={false}
                                        gesture={gesture}
                                        sample={gesture.displayGesture}
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
        );
    }
}