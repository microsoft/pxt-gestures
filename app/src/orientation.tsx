import * as React from "react";
import { observer } from "mobx-react";
import { gestureStore } from "./gesture-store";
import { MotionReading } from "./motion";


const HALF_PI = Math.PI * 0.5;

export function getStyleForReading(reading: MotionReading): React.CSSProperties {
    return {
        transformStyle: "preserve-3d",
        transform: "rotateY(" + (reading.roll - Math.PI) + "rad) rotateX(" + reading.pitch + "rad)",
        padding: 0
    };
}

export interface OrientedDeviceProps {
    width: number;
    height: number;
}

@observer
export class OrientedDevice extends React.Component<OrientedDeviceProps, {}> {

    public render() {
        const orientation = gestureStore.currentOrientation;
        if (!orientation) { return null; }
        const backShowing = -HALF_PI <= orientation.roll && orientation.roll <= HALF_PI;
        const imgSource = backShowing ? "/circuitplayground-back.png" : "/circuitplayground-front.png";
        return (
            <div style={{ perspective: "500px", zIndex: 99, top: 0, left: 500, position: 'absolute' }}>
                <img
                    src={imgSource}
                    width={this.props.width}
                    height={this.props.height}
                    style={getStyleForReading(orientation)}
                />
            </div>
        );
    }
}
