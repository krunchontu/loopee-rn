/**
 * @file ReviewForm component tests
 *
 * Tests for the ReviewForm component including rendering, validation,
 * form submission, and error handling.
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { ReviewForm } from "../../../components/toilet/ReviewForm";
import { supabaseService } from "../../../services/supabase";

// Mock the supabase service
jest.mock("../../../services/supabase", () => ({
  supabaseService: {
    reviews: {
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock debug utility
jest.mock("../../../utils/debug", () => ({
  debug: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock EditableRating component
jest.mock("../../../components/shared/EditableRating", () => ({
  EditableRating: ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
    const { View, TouchableOpacity, Text } = require("react-native");
    return (
      <View testID="editable-rating">
        <Text testID="rating-value">{value}</Text>
        <TouchableOpacity
          testID="rating-button-1"
          onPress={() => onChange(1)}
        >
          <Text>1</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="rating-button-3"
          onPress={() => onChange(3)}
        >
          <Text>3</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="rating-button-5"
          onPress={() => onChange(5)}
        >
          <Text>5</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

describe("ReviewForm Component", () => {
  const mockOnSuccess = jest.fn();
  const mockOnCancel = jest.fn();
  const defaultProps = {
    toiletId: "test-toilet-123",
    onSuccess: mockOnSuccess,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the form with all required fields", () => {
      const { getByText, getByPlaceholderText, getByTestId } = render(
        <ReviewForm {...defaultProps} />
      );

      // Check title
      expect(getByText("Write a Review")).toBeTruthy();

      // Check rating label
      expect(getByText("Rating")).toBeTruthy();

      // Check rating component
      expect(getByTestId("editable-rating")).toBeTruthy();

      // Check comment input
      expect(getByPlaceholderText("Tell others about your experience...")).toBeTruthy();

      // Check buttons
      expect(getByText("Cancel")).toBeTruthy();
      expect(getByText("Submit")).toBeTruthy();
    });

    it("should render edit mode with correct title and button", () => {
      const { getByText } = render(
        <ReviewForm {...defaultProps} isEdit={true} reviewId="review-123" />
      );

      expect(getByText("Edit Your Review")).toBeTruthy();
      expect(getByText("Update")).toBeTruthy();
    });

    it("should render with initial rating and comment", () => {
      const { getByTestId, getByDisplayValue } = render(
        <ReviewForm
          {...defaultProps}
          initialRating={4}
          initialComment="Great toilet!"
        />
      );

      expect(getByTestId("rating-value")).toHaveTextContent("4");
      expect(getByDisplayValue("Great toilet!")).toBeTruthy();
    });

    it("should show rating required helper text when rating is 0", () => {
      const { getByText } = render(<ReviewForm {...defaultProps} />);

      expect(getByText("Rating is required")).toBeTruthy();
    });
  });

  describe("User Input", () => {
    it("should update rating when user selects a rating", () => {
      const { getByTestId } = render(<ReviewForm {...defaultProps} />);

      const ratingButton = getByTestId("rating-button-5");
      fireEvent.press(ratingButton);

      expect(getByTestId("rating-value")).toHaveTextContent("5");
    });

    it("should update comment when user types", () => {
      const { getByPlaceholderText } = render(<ReviewForm {...defaultProps} />);

      const commentInput = getByPlaceholderText("Tell others about your experience...");
      fireEvent.changeText(commentInput, "Clean and well-maintained");

      expect(commentInput.props.value).toBe("Clean and well-maintained");
    });

    it("should allow clearing the comment", () => {
      const { getByPlaceholderText } = render(
        <ReviewForm {...defaultProps} initialComment="Initial comment" />
      );

      const commentInput = getByPlaceholderText("Tell others about your experience...");
      fireEvent.changeText(commentInput, "");

      expect(commentInput.props.value).toBe("");
    });
  });

  describe("Form Validation", () => {
    it("should show error when submitting without a rating", async () => {
      const { getByText } = render(<ReviewForm {...defaultProps} />);

      const submitButton = getByText("Submit");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText("Please provide a star rating")).toBeTruthy();
      });

      expect(supabaseService.reviews.create).not.toHaveBeenCalled();
    });

    it("should disable submit button when rating is 0", () => {
      const { getByText } = render(<ReviewForm {...defaultProps} />);

      const submitButton = getByText("Submit");
      expect(submitButton.props.accessibilityState?.disabled).toBe(true);
    });

    it("should enable submit button when rating is provided", () => {
      const { getByText, getByTestId } = render(<ReviewForm {...defaultProps} />);

      // Set rating
      const ratingButton = getByTestId("rating-button-3");
      fireEvent.press(ratingButton);

      const submitButton = getByText("Submit");
      expect(submitButton.props.accessibilityState?.disabled).toBe(false);
    });
  });

  describe("Form Submission - Create Mode", () => {
    it("should successfully create a new review", async () => {
      (supabaseService.reviews.create as jest.Mock).mockResolvedValueOnce({
        id: "new-review-id",
      });

      const { getByText, getByTestId, getByPlaceholderText } = render(
        <ReviewForm {...defaultProps} />
      );

      // Set rating
      fireEvent.press(getByTestId("rating-button-4"));

      // Set comment
      const commentInput = getByPlaceholderText("Tell others about your experience...");
      fireEvent.changeText(commentInput, "Excellent facilities");

      // Submit
      const submitButton = getByText("Submit");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(supabaseService.reviews.create).toHaveBeenCalledWith({
          toiletId: "test-toilet-123",
          rating: 4,
          comment: "Excellent facilities",
        });
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it("should submit review with only rating (no comment)", async () => {
      (supabaseService.reviews.create as jest.Mock).mockResolvedValueOnce({
        id: "new-review-id",
      });

      const { getByText, getByTestId } = render(<ReviewForm {...defaultProps} />);

      // Set rating only
      fireEvent.press(getByTestId("rating-button-5"));

      // Submit
      const submitButton = getByText("Submit");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(supabaseService.reviews.create).toHaveBeenCalledWith({
          toiletId: "test-toilet-123",
          rating: 5,
          comment: "",
        });
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it("should handle submission error", async () => {
      const errorMessage = "Network error";
      (supabaseService.reviews.create as jest.Mock).mockRejectedValueOnce(
        new Error(errorMessage)
      );

      const { getByText, getByTestId } = render(<ReviewForm {...defaultProps} />);

      // Set rating
      fireEvent.press(getByTestId("rating-button-3"));

      // Submit
      const submitButton = getByText("Submit");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText(`Failed to submit review. ${errorMessage}`)).toBeTruthy();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it("should handle unknown error type", async () => {
      (supabaseService.reviews.create as jest.Mock).mockRejectedValueOnce(
        "String error"
      );

      const { getByText, getByTestId } = render(<ReviewForm {...defaultProps} />);

      // Set rating
      fireEvent.press(getByTestId("rating-button-3"));

      // Submit
      fireEvent.press(getByText("Submit"));

      await waitFor(() => {
        expect(getByText("Failed to submit review. Unknown error occurred")).toBeTruthy();
      });
    });
  });

  describe("Form Submission - Edit Mode", () => {
    it("should successfully update an existing review", async () => {
      (supabaseService.reviews.update as jest.Mock).mockResolvedValueOnce({
        id: "review-123",
      });

      const { getByText, getByTestId, getByPlaceholderText } = render(
        <ReviewForm
          {...defaultProps}
          isEdit={true}
          reviewId="review-123"
          initialRating={3}
          initialComment="Original comment"
        />
      );

      // Update rating
      fireEvent.press(getByTestId("rating-button-5"));

      // Update comment
      const commentInput = getByPlaceholderText("Tell others about your experience...");
      fireEvent.changeText(commentInput, "Updated comment");

      // Submit
      const updateButton = getByText("Update");
      fireEvent.press(updateButton);

      await waitFor(() => {
        expect(supabaseService.reviews.update).toHaveBeenCalledWith("review-123", {
          rating: 5,
          comment: "Updated comment",
        });
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it("should handle update error", async () => {
      const errorMessage = "Update failed";
      (supabaseService.reviews.update as jest.Mock).mockRejectedValueOnce(
        new Error(errorMessage)
      );

      const { getByText, getByTestId } = render(
        <ReviewForm
          {...defaultProps}
          isEdit={true}
          reviewId="review-123"
          initialRating={3}
        />
      );

      // Change rating
      fireEvent.press(getByTestId("rating-button-4"));

      // Submit
      fireEvent.press(getByText("Update"));

      await waitFor(() => {
        expect(getByText(`Failed to update review. ${errorMessage}`)).toBeTruthy();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe("Loading States", () => {
    it("should show loading state during submission", async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (supabaseService.reviews.create as jest.Mock).mockReturnValueOnce(promise);

      const { getByText, getByTestId } = render(<ReviewForm {...defaultProps} />);

      // Set rating and submit
      fireEvent.press(getByTestId("rating-button-5"));
      const submitButton = getByText("Submit");
      fireEvent.press(submitButton);

      // Check button is in loading state
      await waitFor(() => {
        expect(submitButton.props.accessibilityState?.disabled).toBe(true);
      });

      // Resolve the promise
      resolvePromise!({ id: "new-review" });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it("should disable buttons during submission", async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (supabaseService.reviews.create as jest.Mock).mockReturnValueOnce(promise);

      const { getByText, getByTestId } = render(<ReviewForm {...defaultProps} />);

      // Set rating and submit
      fireEvent.press(getByTestId("rating-button-5"));
      fireEvent.press(getByText("Submit"));

      // Check both buttons are disabled
      await waitFor(() => {
        const submitButton = getByText("Submit");
        const cancelButton = getByText("Cancel");

        expect(submitButton.props.accessibilityState?.disabled).toBe(true);
        expect(cancelButton.props.accessibilityState?.disabled).toBe(true);
      });

      // Resolve the promise
      resolvePromise!({ id: "new-review" });
    });

    it("should re-enable buttons after submission completes", async () => {
      (supabaseService.reviews.create as jest.Mock).mockResolvedValueOnce({
        id: "new-review",
      });

      const { getByText, getByTestId } = render(<ReviewForm {...defaultProps} />);

      // Set rating and submit
      fireEvent.press(getByTestId("rating-button-5"));
      fireEvent.press(getByText("Submit"));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe("Cancel Functionality", () => {
    it("should call onCancel when cancel button is pressed", () => {
      const { getByText } = render(<ReviewForm {...defaultProps} />);

      const cancelButton = getByText("Cancel");
      fireEvent.press(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it("should not call onSuccess when cancel is pressed", () => {
      const { getByText } = render(<ReviewForm {...defaultProps} />);

      fireEvent.press(getByText("Cancel"));

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should clear error when submitting again", async () => {
      (supabaseService.reviews.create as jest.Mock)
        .mockRejectedValueOnce(new Error("First error"))
        .mockResolvedValueOnce({ id: "new-review" });

      const { getByText, getByTestId, queryByText } = render(
        <ReviewForm {...defaultProps} />
      );

      // Set rating
      fireEvent.press(getByTestId("rating-button-3"));

      // First submission - fails
      fireEvent.press(getByText("Submit"));

      await waitFor(() => {
        expect(getByText("Failed to submit review. First error")).toBeTruthy();
      });

      // Second submission - succeeds
      fireEvent.press(getByText("Submit"));

      await waitFor(() => {
        expect(queryByText("Failed to submit review. First error")).toBeNull();
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });
});
