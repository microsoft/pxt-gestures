import * as React from "react";
import { getStyleForReading } from "./orientation";
import { observer } from "mobx-react";
import { MotionReading } from "./gesture-data";


export interface MotionTimelineProps {
    width: number;
    height: number;
    hideStillMotion: boolean;
    readings: MotionReading[];
    numReadingsToShow: number; // can be greater than current readings.length
}


@observer
export class MotionTimeline extends React.Component<MotionTimelineProps, {}> {

    private getAmountMoving(): number[] {
        function diffOrientation(o1: MotionReading, o2: MotionReading) {
            return Math.abs(o1.roll - o2.roll) + Math.abs(o1.pitch - o2.pitch)
        }
        return this.props.readings
            .map((rd, i) =>
                (i == 0 ? 0 : diffOrientation(this.props.readings[i - 1], rd)) +
                (i == this.props.readings.length - 1 ? 0 : diffOrientation(this.props.readings[i + 1], rd)));
    }

    public render() {
        const radius = this.props.height * 0.5;
        const spacing = (this.props.width - 2 * radius) / this.props.numReadingsToShow;
        const delta = this.getAmountMoving();
        const THRESHOLD = Math.PI / 10;
        return (
            <div style={{ width: this.props.width, height: this.props.height, top: 0, left: 0, position: 'absolute' }}>
                {
                    this.props.readings.map((reading, i) => {
                        const style = getStyleForReading(reading);
                        style.position = 'absolute';
                        style.left = i * spacing;
                        style.top = 0;
                        style.opacity = this.props.hideStillMotion && delta[i] < THRESHOLD ? 0 : i / this.props.numReadingsToShow;
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
                    }).reverse() // to get the desired z order
                }
            </div >
        );
    }
}