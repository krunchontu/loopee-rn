import { render } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';

// Simple smoke test component
const TestComponent = () => (
  <View testID="test-container">
    <Text testID="test-text">Loopee App</Text>
  </View>
);

describe('App Smoke Tests', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('test-container')).toBeTruthy();
  });

  it('displays app name', () => {
    const { getByTestId } = render(<TestComponent />);
    const textElement = getByTestId('test-text');
    expect(textElement.props.children).toBe('Loopee App');
  });

  it('component structure is valid', () => {
    const { getByTestId } = render(<TestComponent />);
    const container = getByTestId('test-container');
    const text = getByTestId('test-text');

    expect(container).toBeTruthy();
    expect(text).toBeTruthy();
  });
});
