export { fireEvent } from "./fire-event.js";
export {
    findAllByLabelText,
    findAllByRole,
    findAllByTestId,
    findAllByText,
    findByLabelText,
    findByRole,
    findByTestId,
    findByText,
    getAllByLabelText,
    getAllByRole,
    getAllByTestId,
    getAllByText,
    getByLabelText,
    getByRole,
    getByTestId,
    getByText,
    queryAllByLabelText,
    queryAllByRole,
    queryAllByTestId,
    queryAllByText,
    queryByLabelText,
    queryByRole,
    queryByTestId,
    queryByText,
} from "./queries.js";
export { cleanup, render, teardown } from "./render.jsx";
export { screen } from "./screen.js";
export type {
    ByRoleOptions,
    RenderOptions,
    RenderResult,
    TextMatchOptions,
    WaitForOptions,
} from "./types.js";
export type { UserEventInstance, UserEventOptions } from "./user-event.js";
export { userEvent } from "./user-event.js";
export { waitFor, waitForElementToBeRemoved } from "./wait-for.js";
