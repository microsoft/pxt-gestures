import * as React from "react";


const HALF_PI = Math.PI * 0.5;

export function getTransformForMotionReading(reading: { roll: number; pitch: number }): React.CSSProperties {
    return {
        transformStyle: "preserve-3d",
        transform: "rotateY(" + (reading.roll + Math.PI) + "rad) rotateX(" + reading.pitch + "rad)",
        padding: 0
    };
}


export interface OrientedDeviceProps {
    width: number;
    height: number;
    left: number;
    orientation: { roll: number; pitch: number };
}


export class OrientedDevice extends React.Component<OrientedDeviceProps, {}> {

    public render() {
        if (!this.props.orientation) { return null; }
        const backShowing = -HALF_PI <= this.props.orientation.roll && this.props.orientation.roll <= HALF_PI;
        const imgSource = backShowing ? "/circuitplayground-back.png" : "/circuitplayground-front.png";
        return (
            <div style={{ perspective: "500px", zIndex: 99, top: 0, left: this.props.left, position: 'absolute' }}>
                <img
                    src={imgSource}
                    width={this.props.width}
                    height={this.props.height}
                    style={getTransformForMotionReading(this.props.orientation)}
                />
            </div>
        );
    }
}
