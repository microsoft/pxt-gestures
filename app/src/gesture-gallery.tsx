import * as React from "react";
import { gestureStore } from "./gesture-store";
import { observer } from "mobx-react";
import { MotionReading } from "./motion";
import { observable } from "mobx";
import { OrientedDevice } from "./orientation";



export interface GestureGalleryProps {
    newGesture: () => void;
    editGesture: (gestureId: number) => void;
}


interface GestureAnimationProps {
    motion: MotionReading[];
}

@observer
class GestureAnimation extends React.Component<GestureAnimationProps> {
    private index = 0;
    private timer: number;
    @observable private orientation: MotionReading;

    constructor(props: GestureAnimationProps) {
        super(props);
        this.orientation = this.props.motion[0];
        this.tick = this.tick.bind(this);
        this.timer = setInterval(this.tick, 100);
    }

    public tick() {
        this.index = (this.index + 1) % this.props.motion.length;
        this.orientation = this.props.motion[this.index];
    }

    public cancel() { clearInterval(this.timer); }

    public render() {
        return (
            <div style={{ width: 150, height: 150, position: 'relative', margin: 15 }}>
                <OrientedDevice
                    width={150}
                    height={150}
                    left={0}
                    orientation={this.orientation}
                />
            </div>

        );
    }
}



@observer
export class GestureGallery extends React.Component<GestureGalleryProps, {}> {

    constructor(props: GestureGalleryProps) {
        super(props);
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
                            gestureStore.gestures.map((gesture, i) =>
                                <div
                                    className="gesture-card ui link card"
                                    key={gesture.gestureID}
                                >
                                    <div className="content">
                                        <button
                                            className="ui icon button clear right floated aligned top"
                                            tabIndex={-1}
                                            onClick={() => ($('#delete-gesture-' + gesture.gestureID) as any).modal('show')}
                                        >
                                            <i className="trash icon" />
                                        </button>
                                        <div className="ui mini modal" id={"delete-gesture-" + gesture.gestureID} >
                                            <div className="header">Delete Gesture</div>
                                            <div className="content">
                                                <p> Are you sure you want to delete the gesture "{gesture.name}"?</p>
                                            </div>
                                            <div className="actions">
                                                <div className="ui button cancel">No</div>
                                                <div className="ui button ok" onClick={() => gestureStore.deleteGesture(gesture)}>Yes</div>
                                            </div>
                                        </div>

                                        <div
                                            className="content"
                                            onClick={() => { this.props.editGesture(gesture.gestureID) }}
                                        >
                                            <div className="header gesture-name-gallery">
                                                {gesture.name}
                                            </div>

                                            <GestureAnimation motion={gesture.displayGesture.motion} />
                                        </div>

                                    </div>
                                </div>
                            )
                        }
                    </div>
                </div>
            </div>
        );
    }
}