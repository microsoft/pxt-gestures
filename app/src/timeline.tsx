import * as React from "react";
import { gestureStore, ORIENTATION_HISTORY_LIMIT, Orientation } from "./gesture-store";
import { getStyleForOrientation } from "./orientation";
import { observer } from "mobx-react";


export interface GestureTimelineProps {
    width: number;
    height: number;
}


@observer
export class OrientationHistory extends React.Component<GestureTimelineProps, {}> {

    private getAmountMoving(): number[] {
        function diff(o1: Orientation, o2: Orientation) {
            return Math.abs(o1.roll - o2.roll) + Math.abs(o1.pitch - o2.pitch)
        }
        const orientations = gestureStore.recentOrientations;
        return orientations
            .map((or, i) =>
                (i == 0 ? 0 : diff(orientations[i - 1], or)) +
                (i == orientations.length - 1 ? 0 : diff(orientations[i + 1], or)));
    }

    public render() {
        const radius = this.props.height * 0.5;
        const spacing = (this.props.width - radius) / ORIENTATION_HISTORY_LIMIT;
        const delta = this.getAmountMoving();
        const THRESHOLD = Math.PI / 10;
        return (
            <div style={{ width: this.props.width, height: this.props.height, top: 0, left: 0, position: 'absolute' }}>
                {
                    gestureStore.recentOrientations.map((orientation, i) => {
                        const style = getStyleForOrientation(orientation);
                        style.position = 'absolute';
                        style.left = this.props.width - radius - i * spacing;
                        style.top = 0;
                        style.opacity = delta[i] < THRESHOLD ? 0 : i / ORIENTATION_HISTORY_LIMIT;
                        return <svg
                            key={i}
                            width={this.props.height + 2}
                            height={this.props.height + 2}
                            style={style}
                        >
                            <circle
                                className='orientation-history'
                                cx={radius + 1}
                                cy={radius + 1}
                                r={radius}
                            />
                        </svg>
                    })
                }
            </div >
        );
    }
}