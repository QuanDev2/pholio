export type SortOrder = "newest" | "oldest";

export type FilterState = {
  tag: string;
  sort: SortOrder;
  search: string;
};

export type FilterAction =
  | { type: "SET_TAG"; tag: string }
  | { type: "SET_SORT"; sort: SortOrder }
  | { type: "SET_SEARCH"; search: string }
  | { type: "CLEAR_ALL" };

export const initialState: FilterState = {
  tag: "All",
  sort: "newest",
  search: "",
};

export function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case "SET_TAG":
      return { ...state, tag: action.tag };
    case "SET_SORT":
      return { ...state, sort: action.sort };
    case "SET_SEARCH":
      return { ...state, search: action.search };
    case "CLEAR_ALL":
      return initialState;
  }
}
