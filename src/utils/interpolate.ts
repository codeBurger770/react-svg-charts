export function interpolate(value: number, inputRange: [number, number], outputRange: [number, number]) {
    return outputRange[0] + (value - inputRange[0]) * (outputRange[1] - outputRange[0]) / (inputRange[1] - inputRange[0]);
}
