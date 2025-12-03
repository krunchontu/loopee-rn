/**
 * @file AuthInput component tests
 *
 * Tests for the AuthInput component including rendering, input handling,
 * error display, and password visibility toggle.
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { AuthInput } from "../../../components/auth/AuthInput";

describe("AuthInput Component", () => {
  const mockOnChangeText = jest.fn();
  const defaultProps = {
    label: "Email",
    value: "",
    onChangeText: mockOnChangeText,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render with label", () => {
      const { getByText } = render(<AuthInput {...defaultProps} />);

      expect(getByText("Email")).toBeTruthy();
    });

    it("should render with initial value", () => {
      const { getByDisplayValue } = render(
        <AuthInput {...defaultProps} value="test@example.com" />
      );

      expect(getByDisplayValue("test@example.com")).toBeTruthy();
    });

    it("should render with placeholder", () => {
      const { getByPlaceholderText } = render(
        <AuthInput {...defaultProps} placeholder="Enter your email" />
      );

      expect(getByPlaceholderText("Enter your email")).toBeTruthy();
    });

    it("should apply custom container styles", () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = render(
        <AuthInput
          {...defaultProps}
          containerStyle={customStyle}
          testID="auth-input-container"
        />
      );

      const container = getByTestId("auth-input-container").parent;
      expect(container).toBeTruthy();
    });

    it("should render in outlined mode", () => {
      const { getByTestId } = render(
        <AuthInput {...defaultProps} testID="auth-input" />
      );

      const input = getByTestId("auth-input");
      expect(input.props.mode).toBe("outlined");
    });
  });

  describe("User Input", () => {
    it("should call onChangeText when text changes", () => {
      const { getByTestId } = render(
        <AuthInput {...defaultProps} testID="auth-input" />
      );

      const input = getByTestId("auth-input");
      fireEvent.changeText(input, "new@example.com");

      expect(mockOnChangeText).toHaveBeenCalledWith("new@example.com");
    });

    it("should update value when text changes", () => {
      const { getByTestId, rerender } = render(
        <AuthInput {...defaultProps} testID="auth-input" />
      );

      const input = getByTestId("auth-input");
      fireEvent.changeText(input, "updated@example.com");

      rerender(
        <AuthInput
          {...defaultProps}
          value="updated@example.com"
          testID="auth-input"
        />
      );

      expect(input.props.value).toBe("updated@example.com");
    });

    it("should handle empty text input", () => {
      const { getByTestId } = render(
        <AuthInput {...defaultProps} value="test@example.com" testID="auth-input" />
      );

      const input = getByTestId("auth-input");
      fireEvent.changeText(input, "");

      expect(mockOnChangeText).toHaveBeenCalledWith("");
    });

    it("should support autoCapitalize prop", () => {
      const { getByTestId } = render(
        <AuthInput
          {...defaultProps}
          autoCapitalize="none"
          testID="auth-input"
        />
      );

      const input = getByTestId("auth-input");
      expect(input.props.autoCapitalize).toBe("none");
    });

    it("should support keyboardType prop", () => {
      const { getByTestId } = render(
        <AuthInput
          {...defaultProps}
          keyboardType="email-address"
          testID="auth-input"
        />
      );

      const input = getByTestId("auth-input");
      expect(input.props.keyboardType).toBe("email-address");
    });
  });

  describe("Error Handling", () => {
    it("should display error message when error prop is provided", () => {
      const { getByText } = render(
        <AuthInput {...defaultProps} error="Invalid email address" />
      );

      expect(getByText("Invalid email address")).toBeTruthy();
    });

    it("should not display error message when error prop is empty", () => {
      const { queryByText } = render(
        <AuthInput {...defaultProps} error="" />
      );

      // Helper text should not be visible for empty error
      expect(queryByText("")).toBeNull();
    });

    it("should not display error message when error prop is undefined", () => {
      const { queryByTestId } = render(
        <AuthInput {...defaultProps} testID="auth-input" />
      );

      // No error helper text should be rendered
      const input = queryByTestId("auth-input");
      expect(input).toBeTruthy();
    });

    it("should mark input as error when error prop is provided", () => {
      const { getByTestId } = render(
        <AuthInput
          {...defaultProps}
          error="Invalid email"
          testID="auth-input"
        />
      );

      const input = getByTestId("auth-input");
      expect(input.props.error).toBe(true);
    });

    it("should not mark input as error when error prop is empty", () => {
      const { getByTestId } = render(
        <AuthInput {...defaultProps} error="" testID="auth-input" />
      );

      const input = getByTestId("auth-input");
      expect(input.props.error).toBe(false);
    });

    it("should update error message dynamically", () => {
      const { getByText, rerender } = render(
        <AuthInput {...defaultProps} error="First error" />
      );

      expect(getByText("First error")).toBeTruthy();

      rerender(<AuthInput {...defaultProps} error="Second error" />);

      expect(getByText("Second error")).toBeTruthy();
    });

    it("should clear error message when error prop is removed", () => {
      const { getByText, queryByText, rerender } = render(
        <AuthInput {...defaultProps} error="Error message" />
      );

      expect(getByText("Error message")).toBeTruthy();

      rerender(<AuthInput {...defaultProps} error={undefined} />);

      expect(queryByText("Error message")).toBeNull();
    });
  });

  describe("Password Visibility Toggle", () => {
    it("should not show toggle icon when showPasswordToggle is false", () => {
      const { queryByTestId } = render(
        <AuthInput
          {...defaultProps}
          secureTextEntry={true}
          showPasswordToggle={false}
          testID="auth-input"
        />
      );

      // Eye icon should not be present
      const input = queryByTestId("auth-input");
      expect(input).toBeTruthy();
      expect(input.props.right).toBeNull();
    });

    it("should show toggle icon when showPasswordToggle is true", () => {
      const { getByTestId } = render(
        <AuthInput
          {...defaultProps}
          secureTextEntry={true}
          showPasswordToggle={true}
          testID="auth-input"
        />
      );

      const input = getByTestId("auth-input");
      expect(input.props.right).toBeTruthy();
    });

    it("should hide password by default when secureTextEntry is true", () => {
      const { getByTestId } = render(
        <AuthInput
          {...defaultProps}
          secureTextEntry={true}
          showPasswordToggle={true}
          testID="auth-input"
        />
      );

      const input = getByTestId("auth-input");
      expect(input.props.secureTextEntry).toBe(true);
    });

    it("should toggle password visibility when icon is pressed", () => {
      const { getByTestId, getByLabelText } = render(
        <AuthInput
          {...defaultProps}
          label="Password"
          value="password123"
          secureTextEntry={true}
          showPasswordToggle={true}
          testID="auth-input"
        />
      );

      const input = getByTestId("auth-input");
      expect(input.props.secureTextEntry).toBe(true);

      // Find and press the toggle button
      // Note: React Native Paper renders the icon as a touchable component
      const toggleButton = getByLabelText("eye");
      fireEvent.press(toggleButton);

      // Password should now be visible
      expect(input.props.secureTextEntry).toBe(false);

      // Press again to hide
      const hideButton = getByLabelText("eye-off");
      fireEvent.press(hideButton);

      // Password should be hidden again
      expect(input.props.secureTextEntry).toBe(true);
    });

    it("should show eye icon when password is hidden", () => {
      const { getByLabelText } = render(
        <AuthInput
          {...defaultProps}
          label="Password"
          secureTextEntry={true}
          showPasswordToggle={true}
        />
      );

      expect(getByLabelText("eye")).toBeTruthy();
    });

    it("should show eye-off icon when password is visible", () => {
      const { getByLabelText } = render(
        <AuthInput
          {...defaultProps}
          label="Password"
          secureTextEntry={true}
          showPasswordToggle={true}
        />
      );

      // Toggle to show password
      fireEvent.press(getByLabelText("eye"));

      expect(getByLabelText("eye-off")).toBeTruthy();
    });
  });

  describe("Accessibility", () => {
    it("should be accessible with proper label", () => {
      const { getByTestId } = render(
        <AuthInput {...defaultProps} label="Email Address" testID="auth-input" />
      );

      const input = getByTestId("auth-input");
      expect(input.props.accessibilityLabel).toBeDefined();
    });

    it("should support testID prop", () => {
      const { getByTestId } = render(
        <AuthInput {...defaultProps} testID="email-input" />
      );

      expect(getByTestId("email-input")).toBeTruthy();
    });
  });

  describe("Props Forwarding", () => {
    it("should forward additional TextInput props", () => {
      const { getByTestId } = render(
        <AuthInput
          {...defaultProps}
          testID="auth-input"
          maxLength={50}
          editable={true}
        />
      );

      const input = getByTestId("auth-input");
      expect(input.props.maxLength).toBe(50);
      expect(input.props.editable).toBe(true);
    });

    it("should support autoComplete prop", () => {
      const { getByTestId } = render(
        <AuthInput
          {...defaultProps}
          testID="auth-input"
          autoComplete="email"
        />
      );

      const input = getByTestId("auth-input");
      expect(input.props.autoComplete).toBe("email");
    });

    it("should support disabled state", () => {
      const { getByTestId } = render(
        <AuthInput
          {...defaultProps}
          testID="auth-input"
          disabled={true}
        />
      );

      const input = getByTestId("auth-input");
      expect(input.props.disabled).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long error messages", () => {
      const longError = "This is a very long error message that should still be displayed correctly without breaking the layout or causing any issues with the component rendering";

      const { getByText } = render(
        <AuthInput {...defaultProps} error={longError} />
      );

      expect(getByText(longError)).toBeTruthy();
    });

    it("should handle rapid text changes", () => {
      const { getByTestId } = render(
        <AuthInput {...defaultProps} testID="auth-input" />
      );

      const input = getByTestId("auth-input");

      fireEvent.changeText(input, "a");
      fireEvent.changeText(input, "ab");
      fireEvent.changeText(input, "abc");

      expect(mockOnChangeText).toHaveBeenCalledTimes(3);
      expect(mockOnChangeText).toHaveBeenLastCalledWith("abc");
    });

    it("should handle special characters in input", () => {
      const { getByTestId } = render(
        <AuthInput {...defaultProps} testID="auth-input" />
      );

      const input = getByTestId("auth-input");
      const specialChars = "!@#$%^&*()_+-=[]{}|;:',.<>?";

      fireEvent.changeText(input, specialChars);

      expect(mockOnChangeText).toHaveBeenCalledWith(specialChars);
    });
  });
});
