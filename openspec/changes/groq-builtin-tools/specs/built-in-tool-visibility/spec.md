# Built-In Tool Visibility Specification

## Purpose

Surface Groq `executed_tools` metadata in the chat UI so users see which built-in tools ran, their arguments, and their output — for compound and GPT-OSS models.

## Requirements

### Requirement: Tool Type Chips

The system MUST display one chip per executed tool above the assistant message, labeled with the tool type (`web_search`, `code_interpreter`, `visit_website`, `wolfram_alpha`, `browser_search`).

#### Scenario: Compound response with multiple tools

- GIVEN a compound model response containing `executed_tools` with `web_search` and `code_interpreter`
- WHEN the response is rendered
- THEN two chips labeled with each tool type appear above the assistant message

#### Scenario: No tools executed

- GIVEN a response with empty or absent `executed_tools`
- WHEN the response is rendered
- THEN no chips appear and no empty tool section is shown

### Requirement: Collapsible Tool Detail

The system MUST provide an expandable detail section per tool showing its arguments and output.

#### Scenario: Expand a tool chip

- GIVEN tool chips are displayed
- WHEN the user clicks a chip
- THEN a detail section expands showing the tool's arguments and output
- AND clicking again collapses it

### Requirement: Output Truncation

The system MUST truncate tool output to ~500 characters with a "Ver más" button to expand fully. The expanded view MUST scroll for long output.

#### Scenario: Long output truncation

- GIVEN a tool output exceeding 500 characters
- WHEN the detail section is expanded
- THEN output is truncated at ~500 chars with a "Ver más" button
- AND clicking "Ver más" reveals full output in a scrollable container

#### Scenario: Short output no truncation

- GIVEN a tool output under 500 characters
- WHEN the detail section is expanded
- THEN full output is shown with no "Ver más" button

### Requirement: Streaming Indicator

The system MUST show an "Ejecutando herramientas..." indicator while a request to a tool-capable model is in flight, before the response arrives.

#### Scenario: Indicator during request

- GIVEN a request is sent to a compound or GPT-OSS model
- WHEN the response has not yet arrived
- THEN "Ejecutando herramientas..." is displayed
- AND the indicator is replaced by chips when `executed_tools` arrives

### Requirement: Chip Timing

Chips MUST appear only when the response completes and `executed_tools` is present in the final response (there is no streaming today; `executed_tools` arrives in the final JSON).

#### Scenario: Chips on completion

- GIVEN a completed response with `executed_tools`
- WHEN response parsing finishes
- THEN chips render immediately alongside the assistant message

### Requirement: Variable Output Shape Handling

The system MUST handle `search_results`, `code_results`, and generic `output` shapes, degrading gracefully on unknown types without crashing.

#### Scenario: web_search with search_results

- GIVEN an executed tool of type `web_search` with `search_results`
- WHEN rendered
- THEN the detail shows search queries and result titles/URLs

#### Scenario: code_interpreter with code_results

- GIVEN an executed tool of type `code_interpreter` with `code_results`
- WHEN rendered
- THEN the detail shows executed code and code results

#### Scenario: Unknown tool type fallback

- GIVEN an executed tool of an unrecognized type
- WHEN rendered
- THEN the detail shows raw arguments and output as a generic fallback
- AND no crash occurs

### Requirement: Model Coverage

Visibility MUST work for both Groq compound models and GPT-OSS models that return `executed_tools`.

#### Scenario: GPT-OSS response

- GIVEN a GPT-OSS model response with `executed_tools`
- WHEN rendered
- THEN chips and detail display identically to compound models
