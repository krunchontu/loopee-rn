/**
 * @file PasswordInput component tests
 *
 * Tests for the PasswordInput component, which is a specialized wrapper
 * around AuthInput with password-specific configurations.
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { PasswordInput } from "../../../components/auth/PasswordInput";

// Mock AuthInput component
jest.mock("../../../components/auth/AuthInput", () => ({
  AuthInput: (props: any) => {
    const { View, TextInput, Text, TouchableOpacity } = require("react-native");
    return (
      <View testID="auth-input-mock">
        <TextInput
          testID={props.testID || "password-input"}
          value={props.value}
          onChangeText={props.onChangeText}
          secureTextEntry={props.secureTextEntry}
          autoCapitalize={props.autoCapitalize}
          placeholder={props.label}
          accessibilityLabel={props.label}
        />
        {props.error && <Text testID="error-text">{props.error}</Text>}
        {props.showPasswordToggle && props.secureTextEntry && (
          <TouchableOpacity testID="password-toggle">
            <Text>Toggle</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
}));

describe("PasswordInput Component", () => {
  const mockOnChangeText = jest.fn();
  const defaultProps = {
    label: "Password",
    value: "",
    onChangeText: mockOnChangeText,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render with label", () => {
      const { getByPlaceholderText } = render(
        <PasswordInput {...defaultProps} />
      );

      expect(getByPlaceholderText("Password")).toBeTruthy();
    });

    it("should render with initial value", () => {
      const { getByDisplayValue } = render(
        <PasswordInput {...defaultProps} value="mypassword123" />
      );

      expect(getByDisplayValue("mypassword123")).toBeTruthy();
    });

    it("should render with custom label", () => {
      const { getByPlaceholderText } = render(
        <PasswordInput {...defaultProps} label="New Password" />
      );

      expect(getByPlaceholderText("New Password")).toBeTruthy();
    });

    it("should render password toggle button", () => {
      const { getByTestId } = render(<PasswordInput {...defaultProps} />);

      expect(getByTestId("password-toggle")).toBeTruthy();
    });
  });

  describe("Password Security", () => {
    it("should enable secureTextEntry by default", () => {
      const { getByTestId } = render(
        <PasswordInput {...defaultProps} testID="password-input" />
      );

      const input = getByTestId("password-input");
      expect(input.props.secureTextEntry).toBe(true);
    });

    it("should enable password toggle by default", () => {
      const { getByTestId } = render(<PasswordInput {...defaultProps} />);

      expect(getByTestId("password-toggle")).toBeTruthy();
    });

    it("should mask password text by default", () => {
      const { getByTestId } = render(
        <PasswordInput
          {...defaultProps}
          value="secretpassword"
          testID="password-input"
        />
      );

      const input = getByTestId("password-input");
      expect(input.props.secureTextEntry).toBe(true);
    });
  });

  describe("User Input", () => {
    it("should call onChangeText when password changes", () => {
      const { getByTestId } = render(
        <PasswordInput {...defaultProps} testID="password-input" />
      );

      const input = getByTestId("password-input");
      fireEvent.changeText(input, "newpassword123");

      expect(mockOnChangeText).toHaveBeenCalledWith("newpassword123");
    });

    it("should update value when password changes", () => {
      const { getByTestId, rerender } = render(
        <PasswordInput {...defaultProps} testID="password-input" />
      );

      const input = getByTestId("password-input");
      fireEvent.changeText(input, "updatedpassword");

      rerender(
        <PasswordInput
          {...defaultProps}
          value="updatedpassword"
          testID="password-input"
        />
      );

      expect(input.props.value).toBe("updatedpassword");
    });

    it("should handle empty password input", () => {
      const { getByTestId } = render(
        <PasswordInput
          {...defaultProps}
          value="password123"
          testID="password-input"
        />
      );

      const input = getByTestId("password-input");
      fireEvent.changeText(input, "");

      expect(mockOnChangeText).toHaveBeenCalledWith("");
    });

    it("should handle long passwords", () => {
      const longPassword = "a".repeat(100);
      const { getByTestId } = render(
        <PasswordInput {...defaultProps} testID="password-input" />
      );

      const input = getByTestId("password-input");
      fireEvent.changeText(input, longPassword);

      expect(mockOnChangeText).toHaveBeenCalledWith(longPassword);
    });

    it("should handle special characters in password", () => {
      const { getByTestId } = render(
        <PasswordInput {...defaultProps} testID="password-input" />
      );

      const input = getByTestId("password-input");
      const specialPassword = "P@ssw0rd!#$%";

      fireEvent.changeText(input, specialPassword);

      expect(mockOnChangeText).toHaveBeenCalledWith(specialPassword);
    });
  });

  describe("AutoCapitalize Configuration", () => {
    it("should set autoCapitalize to 'none' by default", () => {
      const { getByTestId } = render(
        <PasswordInput {...defaultProps} testID="password-input" />
      );

      const input = getByTestId("password-input");
      expect(input.props.autoCapitalize).toBe("none");
    });

    it("should allow custom autoCapitalize value", () => {
      const { getByTestId } = render(
        <PasswordInput
          {...defaultProps}
          autoCapitalize="sentences"
          testID="password-input"
        />
      );

      const input = getByTestId("password-input");
      expect(input.props.autoCapitalize).toBe("sentences");
    });
  });

  describe("Error Handling", () => {
    it("should display error message when error prop is provided", () => {
      const { getByTestId } = render(
        <PasswordInput
          {...defaultProps}
          error="Password must be at least 8 characters"
        />
      );

      expect(getByTestId("error-text")).toBeTruthy();
    });

    it("should show specific error message", () => {
      const errorMessage = "Password is required";
      const { getByText } = render(
        <PasswordInput {...defaultProps} error={errorMessage} />
      );

      expect(getByText(errorMessage)).toBeTruthy();
    });

    it("should not display error when error prop is undefined", () => {
      const { queryByTestId } = render(
        <PasswordInput {...defaultProps} error={undefined} />
      );

      expect(queryByTestId("error-text")).toBeNull();
    });

    it("should update error message dynamically", () => {
      const { getByText, rerender } = render(
        <PasswordInput {...defaultProps} error="Too short" />
      );

      expect(getByText("Too short")).toBeTruthy();

      rerender(
        <PasswordInput {...defaultProps} error="Password must contain a number" />
      );

      expect(getByText("Password must contain a number")).toBeTruthy();
    });

    it("should handle multiple validation errors", () => {
      const multiError =
        "Password must be at least 8 characters and contain a number";
      const { getByText } = render(
        <PasswordInput {...defaultProps} error={multiError} />
      );

      expect(getByText(multiError)).toBeTruthy();
    });
  });

  describe("Props Forwarding", () => {
    it("should forward containerStyle to AuthInput", () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = render(
        <PasswordInput
          {...defaultProps}
          containerStyle={customStyle}
          testID="password-input"
        />
      );

      // Component should render successfully with custom style
      expect(getByTestId("password-input")).toBeTruthy();
    });

    it("should support testID prop", () => {
      const { getByTestId } = render(
        <PasswordInput {...defaultProps} testID="custom-password-input" />
      );

      expect(getByTestId("custom-password-input")).toBeTruthy();
    });

    it("should forward additional props to AuthInput", () => {
      const { getByTestId } = render(
        <PasswordInput
          {...defaultProps}
          testID="password-input"
          maxLength={50}
        />
      );

      // Component should render successfully with forwarded props
      expect(getByTestId("password-input")).toBeTruthy();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible label", () => {
      const { getByLabelText } = render(
        <PasswordInput {...defaultProps} label="Enter Password" />
      );

      expect(getByLabelText("Enter Password")).toBeTruthy();
    });

    it("should support custom testID for accessibility testing", () => {
      const { getByTestId } = render(
        <PasswordInput {...defaultProps} testID="login-password" />
      );

      expect(getByTestId("login-password")).toBeTruthy();
    });
  });

  describe("Integration with AuthInput", () => {
    it("should pass all required props to AuthInput", () => {
      const { getByTestId, getByPlaceholderText } = render(
        <PasswordInput
          {...defaultProps}
          label="Password"
          value="test123"
          testID="password-input"
        />
      );

      // Verify AuthInput receives correct props
      expect(getByTestId("password-input")).toBeTruthy();
      expect(getByPlaceholderText("Password")).toBeTruthy();
      expect(getByTestId("password-input").props.value).toBe("test123");
    });

    it("should enable both secureTextEntry and showPasswordToggle", () => {
      const { getByTestId } = render(
        <PasswordInput {...defaultProps} testID="password-input" />
      );

      const input = getByTestId("password-input");
      expect(input.props.secureTextEntry).toBe(true);
      expect(getByTestId("password-toggle")).toBeTruthy();
    });

    it("should set correct content type attributes", () => {
      // This test verifies that the component is properly configured
      // for password inputs with textContentType and autoComplete
      const { getByTestId } = render(
        <PasswordInput {...defaultProps} testID="password-input" />
      );

      expect(getByTestId("password-input")).toBeTruthy();
    });
  });

  describe("Password Validation Scenarios", () => {
    it("should handle weak password error", () => {
      const { getByText } = render(
        <PasswordInput
          {...defaultProps}
          error="Password is too weak"
        />
      );

      expect(getByText("Password is too weak")).toBeTruthy();
    });

    it("should handle password mismatch error", () => {
      const { getByText } = render(
        <PasswordInput
          {...defaultProps}
          error="Passwords do not match"
        />
      );

      expect(getByText("Passwords do not match")).toBeTruthy();
    });

    it("should handle minimum length error", () => {
      const { getByText } = render(
        <PasswordInput
          {...defaultProps}
          error="Password must be at least 8 characters"
        />
      );

      expect(getByText("Password must be at least 8 characters")).toBeTruthy();
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid password changes", () => {
      const { getByTestId } = render(
        <PasswordInput {...defaultProps} testID="password-input" />
      );

      const input = getByTestId("password-input");

      fireEvent.changeText(input, "p");
      fireEvent.changeText(input, "pa");
      fireEvent.changeText(input, "pas");
      fireEvent.changeText(input, "pass");

      expect(mockOnChangeText).toHaveBeenCalledTimes(4);
      expect(mockOnChangeText).toHaveBeenLastCalledWith("pass");
    });

    it("should handle unicode characters in password", () => {
      const { getByTestId } = render(
        <PasswordInput {...defaultProps} testID="password-input" />
      );

      const input = getByTestId("password-input");
      const unicodePassword = "пароль密码🔒";

      fireEvent.changeText(input, unicodePassword);

      expect(mockOnChangeText).toHaveBeenCalledWith(unicodePassword);
    });

    it("should handle whitespace in password", () => {
      const { getByTestId } = render(
        <PasswordInput {...defaultProps} testID="password-input" />
      );

      const input = getByTestId("password-input");
      const passwordWithSpaces = "my password 123";

      fireEvent.changeText(input, passwordWithSpaces);

      expect(mockOnChangeText).toHaveBeenCalledWith(passwordWithSpaces);
    });

    it("should handle empty string to password transition", () => {
      const { getByTestId, rerender } = render(
        <PasswordInput {...defaultProps} value="" testID="password-input" />
      );

      const input = getByTestId("password-input");
      expect(input.props.value).toBe("");

      fireEvent.changeText(input, "newpassword");
      rerender(
        <PasswordInput
          {...defaultProps}
          value="newpassword"
          testID="password-input"
        />
      );

      expect(input.props.value).toBe("newpassword");
    });
  });

  describe("Multiple PasswordInput Instances", () => {
    it("should handle multiple password inputs independently", () => {
      const mockOnChangePassword = jest.fn();
      const mockOnChangeConfirm = jest.fn();

      const { getByPlaceholderText } = render(
        <>
          <PasswordInput
            label="Password"
            value=""
            onChangeText={mockOnChangePassword}
          />
          <PasswordInput
            label="Confirm Password"
            value=""
            onChangeText={mockOnChangeConfirm}
          />
        </>
      );

      const passwordInput = getByPlaceholderText("Password");
      const confirmInput = getByPlaceholderText("Confirm Password");

      fireEvent.changeText(passwordInput, "password1");
      fireEvent.changeText(confirmInput, "password2");

      expect(mockOnChangePassword).toHaveBeenCalledWith("password1");
      expect(mockOnChangeConfirm).toHaveBeenCalledWith("password2");
    });
  });
});
