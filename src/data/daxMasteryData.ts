export interface DaxFunctionItem {
  id: number;
  name: string;
  category: string;
  priority: '⭐⭐⭐' | '⭐⭐' | '⭐' | '🔵';
  defaultStatus: 'DONE' | 'LEARNING' | 'PLANNED';
  syntax: string;
  parameters: string;
  purpose: string;
  pitfall: string;
}

export const DAX_MASTER_DATA: DaxFunctionItem[] = [
  {
    "name": "SUM",
    "category": "Scalar / Math",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "SUM(<column>)",
    "parameters": "Numeric column",
    "purpose": "Adds numeric values.",
    "pitfall": "Cannot take row-by-row expressions (use `SUMX`).",
    "id": 1
  },
  {
    "name": "COUNT",
    "category": "Scalar / Math",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "COUNT(<column>)",
    "parameters": "Column (numbers, dates, strings)",
    "purpose": "Counts non-blank rows with valid values.",
    "pitfall": "Counts only rows with values; use `COUNTROWS` for table rows.",
    "id": 2
  },
  {
    "name": "COUNTROWS",
    "category": "Scalar / Math",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "COUNTROWS([<table>])",
    "parameters": "Table expression",
    "purpose": "Counts total rows in table or context.",
    "pitfall": "Much faster than `COUNT(<col>)` on fact tables.",
    "id": 3
  },
  {
    "name": "DISTINCTCOUNT",
    "category": "Scalar / Math",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "DISTINCTCOUNT(<column>)",
    "parameters": "Column",
    "purpose": "Counts distinct values including blank if present.",
    "pitfall": "Slower on high-cardinality columns; consider `DISTINCTCOUNTNOBLANK`.",
    "id": 4
  },
  {
    "name": "DIVIDE",
    "category": "Scalar / Math",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "DIVIDE(<num>, <denom>[, <alt>])",
    "parameters": "Scalar expressions; optional fallback",
    "purpose": "Safe division returning alternate or BLANK on /0.",
    "pitfall": "Never use `/` in production measures; always use `DIVIDE`.",
    "id": 5
  },
  {
    "name": "IF",
    "category": "Scalar / Math",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "IF(<test>, <true>[, <false>])",
    "parameters": "Boolean test; scalar outputs",
    "purpose": "Conditional evaluation.",
    "pitfall": "Nested `IF` statements become unreadable; prefer `SWITCH(TRUE())`.",
    "id": 6
  },
  {
    "name": "IFERROR",
    "category": "Scalar / Math",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "IFERROR(<value>, <value_if_error>)",
    "parameters": "scalar value; fallback on error",
    "purpose": "Catches and replaces error conditions with a fallback value.",
    "pitfall": "Prefer defensive logic (e.g. DIVIDE) rather than blanketing expressions in IFERROR, which can mask bugs.",
    "id": 7
  },
  {
    "name": "SWITCH",
    "category": "Scalar / Math",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "SWITCH(<expr>, <val>, <res>[, ...][, <else>])",
    "parameters": "Scalar expression + matching pairs",
    "purpose": "Evaluates against multiple fixed values.",
    "pitfall": "Limited to equality comparisons on one value.",
    "id": 8
  },
  {
    "name": "SWITCH(TRUE())",
    "category": "Scalar / Math",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "SWITCH(TRUE(), <cond1>, <res1>[, ...])",
    "parameters": "Boolean conditions + results",
    "purpose": "Evaluates complex multi-condition logic top-down.",
    "pitfall": "Conditions evaluate sequentially; order matters for performance.",
    "id": 9
  },
  {
    "name": "COALESCE",
    "category": "Scalar / Math",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "COALESCE(<expr1>, <expr2>[, ...])",
    "parameters": "List of scalar expressions",
    "purpose": "Returns first non-BLANK value in arguments.",
    "pitfall": "Ensure data types of arguments match or can implicitly convert.",
    "id": 10
  },
  {
    "name": "ISBLANK",
    "category": "Scalar / Math",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "ISBLANK(<val>)",
    "parameters": "Scalar value / expression",
    "purpose": "Checks if an expression evaluates to BLANK.",
    "pitfall": "In DAX, `val = 0` evaluates to TRUE for BLANK; use `ISBLANK` to be explicit.",
    "id": 11
  },
  {
    "name": "CALCULATE",
    "category": "Filter Context",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "CALCULATE(<expr>[, <filter>...])",
    "parameters": "Scalar expression; boolean/table filters/modifiers",
    "purpose": "Evaluates expression in a modified filter context; triggers context transition.",
    "pitfall": "Costly inside nested row iterators if triggered unnecessarily.",
    "id": 12
  },
  {
    "name": "CALCULATETABLE",
    "category": "Filter Context",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "CALCULATETABLE(<table>[, <filter>...])",
    "parameters": "Table expression; filter modifiers",
    "purpose": "Modifies filter context and returns a table.",
    "pitfall": "Used when constructing virtual tables under modified context.",
    "id": 13
  },
  {
    "name": "FILTER",
    "category": "Filter Context",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "FILTER(<table>, <condition>)",
    "parameters": "Table; boolean row condition",
    "purpose": "Iterates table and filters rows where condition is TRUE.",
    "pitfall": "Do not filter entire fact table: `FILTER(Sales, ...)` is an anti-pattern.",
    "id": 14
  },
  {
    "name": "ALL",
    "category": "Filter Context",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "ALL([<table> \\",
    "parameters": "<col>...])`",
    "purpose": "Table or column list",
    "pitfall": "Removes filters from target and returns distinct values/rows.",
    "id": 15
  },
  {
    "name": "REMOVEFILTERS",
    "category": "Filter Context",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "REMOVEFILTERS([<table> \\",
    "parameters": "<col>...])`",
    "purpose": "Table or column list",
    "pitfall": "Explicit filter removal modifier inside `CALCULATE`.",
    "id": 16
  },
  {
    "name": "ALLSELECTED",
    "category": "Filter Context",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "ALLSELECTED([<table> \\",
    "parameters": "<col>...])`",
    "purpose": "Table or column list",
    "pitfall": "Preserves visual/slicer filters while clearing inner table axis filters.",
    "id": 17
  },
  {
    "name": "ALLEXCEPT",
    "category": "Filter Context",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "ALLEXCEPT(<table>, <col>...)",
    "parameters": "Table + columns to keep filters on",
    "purpose": "Clears filters on table except specified columns.",
    "pitfall": "Sensitive to newly added columns in dimension tables.",
    "id": 18
  },
  {
    "name": "KEEPFILTERS",
    "category": "Filter Context",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "KEEPFILTERS(<expr>)",
    "parameters": "Filter / table expression",
    "purpose": "Changes filter behavior from overwrite (default) to intersection.",
    "pitfall": "Use to avoid clearing existing slicer filters during overrides.",
    "id": 19
  },
  {
    "name": "USERELATIONSHIP",
    "category": "Filter Context",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "USERELATIONSHIP(<col1>, <col2>)",
    "parameters": "Related columns in existing inactive link",
    "purpose": "Activates inactive relationship for duration of `CALCULATE`.",
    "pitfall": "Both columns must be part of an existing relationship in model.",
    "id": 20
  },
  {
    "name": "CROSSFILTER",
    "category": "Filter Context",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "CROSSFILTER(<col1>, <col2>, <dir>)",
    "parameters": "Related columns; `NONE`/`ONE`/`BOTH`",
    "purpose": "Modifies relationship direction dynamically.",
    "pitfall": "Avoid `BOTH` permanently in models; use `CROSSFILTER` dynamically.",
    "id": 21
  },
  {
    "name": "TREATAS",
    "category": "Filter Context",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "TREATAS(<table_expr>, <col>...)",
    "parameters": "In-memory table + target columns",
    "purpose": "Applies virtual relationships without physical model links.",
    "pitfall": "Faster than `INTERSECT` or `CONTAINS` for disconnected filtering.",
    "id": 22
  },
  {
    "name": "RELATED",
    "category": "Filter Context",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "RELATED(<column>)",
    "parameters": "Target column on \"one\" side",
    "purpose": "Retrieves single value from related lookup table via row context.",
    "pitfall": "Requires an active physical relationship from many-to-one.",
    "id": 23
  },
  {
    "name": "RELATEDTABLE",
    "category": "Filter Context",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "RELATEDTABLE(<table>)",
    "parameters": "Target table on \"many\" side",
    "purpose": "Returns all matching rows from related table in current row context.",
    "pitfall": "Creates virtual table; best combined inside `COUNTROWS` or iterators.",
    "id": 24
  },
  {
    "name": "LOOKUPVALUE",
    "category": "Filter Context",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "LOOKUPVALUE(<res>, <search>, <val>[, ...])",
    "parameters": "Result column; search pairs; optional fallback",
    "purpose": "Fetches value without relationship.",
    "pitfall": "Slower than `RELATED`; throws error if multiple matches found.",
    "id": 25
  },
  {
    "name": "SELECTEDVALUE",
    "category": "Context Inspection",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "SELECTEDVALUE(<col>[, <alt>])",
    "parameters": "Column; optional fallback",
    "purpose": "Returns single selected value or alternate if 0 or 2+ values present.",
    "pitfall": "Shortcut for `IF(HASONEVALUE(col), VALUES(col), alt)`.",
    "id": 26
  },
  {
    "name": "HASONEVALUE",
    "category": "Context Inspection",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "HASONEVALUE(<col>)",
    "parameters": "Column",
    "purpose": "Returns TRUE if exactly 1 distinct value remains in filter context.",
    "pitfall": "Returns FALSE on blank rows or total levels.",
    "id": 27
  },
  {
    "name": "ISINSCOPE",
    "category": "Context Inspection",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "ISINSCOPE(<col>)",
    "parameters": "Column",
    "purpose": "Detects current level in visual hierarchy (Matrix rows/columns).",
    "pitfall": "Essential for subtotal/grand total ratio calculations.",
    "id": 28
  },
  {
    "name": "ISCROSSFILTERED",
    "category": "Context Inspection",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "LEARNING",
    "syntax": "ISCROSSFILTERED(<tableOrCol>)",
    "parameters": "Table or column",
    "purpose": "Returns TRUE if column/table is filtered directly or via related table.",
    "pitfall": "Returns TRUE even if filter comes from a different dimension.",
    "id": 29
  },
  {
    "name": "ISFILTERED",
    "category": "Context Inspection",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "ISFILTERED(<tableOrCol>)",
    "parameters": "Table or column",
    "purpose": "Returns TRUE only if column has direct filters applied.",
    "pitfall": "Does not detect cross-table filter propagation.",
    "id": 30
  },
  {
    "name": "SUMX",
    "category": "Iterators",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "SUMX(<table>, <expr>)",
    "parameters": "Table expression; row expression",
    "purpose": "Iterates table row-by-row, computes expression, and sums results.",
    "pitfall": "Wrap naked columns in measures or invoke context transition carefully.",
    "id": 31
  },
  {
    "name": "AVERAGEX",
    "category": "Iterators",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "AVERAGEX(<table>, <expr>)",
    "parameters": "Table; row expression",
    "purpose": "Iterates and averages expression result across rows.",
    "pitfall": "Note: only averages non-blank row results.",
    "id": 32
  },
  {
    "name": "MINX",
    "category": "Iterators",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "MINX(<table>, <expr>)",
    "parameters": "Table; row expression",
    "purpose": "Finds minimum computed value across iterated rows.",
    "pitfall": "Evaluates expression for every row in table.",
    "id": 33
  },
  {
    "name": "MAXX",
    "category": "Iterators",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "MAXX(<table>, <expr>)",
    "parameters": "Table; row expression",
    "purpose": "Finds maximum computed value across iterated rows.",
    "pitfall": "High CPU usage on multi-million row tables if un-filtered.",
    "id": 34
  },
  {
    "name": "COUNTX",
    "category": "Iterators",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "COUNTX(<table>, <expr>)",
    "parameters": "Table; row expression",
    "purpose": "Counts rows where evaluated expression produces non-blank.",
    "pitfall": "To count all rows unconditionally, use `COUNTROWS(table)`.",
    "id": 35
  },
  {
    "name": "MEDIANX",
    "category": "Iterators",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "MEDIANX(<table>, <expr>)",
    "parameters": "Table; row expression",
    "purpose": "Calculates median of row-level expression.",
    "pitfall": "Resource-intensive; filter input table beforehand.",
    "id": 36
  },
  {
    "name": "PRODUCTX",
    "category": "Iterators",
    "priority": "\ud83d\udd35",
    "defaultStatus": "PLANNED",
    "syntax": "PRODUCTX(<table>, <expr>)",
    "parameters": "Table; row expression",
    "purpose": "Multiplies evaluated expression across rows (compounding).",
    "pitfall": "Negative values or zeroes require careful mathematical handling.",
    "id": 37
  },
  {
    "name": "CONCATENATEX",
    "category": "Iterators",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "CONCATENATEX(<table>, <expr>[, <delim>[, <order>]])",
    "parameters": "Table; expression; delimiter; sorting",
    "purpose": "Joins row expressions into single concatenated string.",
    "pitfall": "Truncate output if rows exceed thousands to avoid visual slowdown.",
    "id": 38
  },
  {
    "name": "RANKX",
    "category": "Iterators",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "RANKX(<table>, <expr>[, <val>[, <order>[, <ties>]]])",
    "parameters": "Table; expression; optional val/order/ties",
    "purpose": "Calculates rank of current row expression within table.",
    "pitfall": "Prone to context transition bugs; always wrap measure in `[Measure]`.",
    "id": 39
  },
  {
    "name": "TOPN",
    "category": "Iterators",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "TOPN(<n>, <table>, <orderExpr>[, <order>...])",
    "parameters": "Integer N; table; sort expr; ASC/DESC",
    "purpose": "Returns top N rows of a table based on sort order.",
    "pitfall": "Returns table, not scalar; must combine with `CALCULATE` or iterators.",
    "id": 40
  },
  {
    "name": "VALUES",
    "category": "Table Shaping",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "VALUES(<colOrTable>)",
    "parameters": "Column or table",
    "purpose": "Returns unique values in current context, including Blank row.",
    "pitfall": "Blank row appears if referential integrity violation exists.",
    "id": 41
  },
  {
    "name": "DISTINCT",
    "category": "Table Shaping",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "DISTINCT(<colOrTable>)",
    "parameters": "Column or table",
    "purpose": "Returns unique values; ignores relationship blank row.",
    "pitfall": "Use `VALUES` for slicer integrity; `DISTINCT` for strict distinct sets.",
    "id": 42
  },
  {
    "name": "ADDCOLUMNS",
    "category": "Table Shaping",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "ADDCOLUMNS(<table>, <name>, <expr>[, ...])",
    "parameters": "Table; column name; row expression",
    "purpose": "Extends table with new calculated virtual columns.",
    "pitfall": "Executes in row context; wrap measures to trigger context transition.",
    "id": 43
  },
  {
    "name": "SELECTCOLUMNS",
    "category": "Table Shaping",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "SELECTCOLUMNS(<table>, <name>, <expr>[, ...])",
    "parameters": "Table; output names; expressions",
    "purpose": "Projects specific columns and renames them.",
    "pitfall": "Drops all other original columns not explicitly listed.",
    "id": 44
  },
  {
    "name": "SUMMARIZE",
    "category": "Table Shaping",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "SUMMARIZE(<table>, <groupByCol>...)",
    "parameters": "Table; grouping columns",
    "purpose": "Groups table by distinct column combinations.",
    "pitfall": "DO NOT add measure aggregations here; use `ADDCOLUMNS(SUMMARIZE(...))`.",
    "id": 45
  },
  {
    "name": "SUMMARIZECOLUMNS",
    "category": "Table Shaping",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "SUMMARIZECOLUMNS(<group>...[, <filter>]...[, <name>, <expr>]...)",
    "parameters": "Grouping cols; filter tables; named metrics",
    "purpose": "Best-in-class grouped aggregation query generator.",
    "pitfall": "Cannot be called within a context transition in measures.",
    "id": 46
  },
  {
    "name": "GROUPBY",
    "category": "Table Shaping",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "GROUPBY(<table>, <group>...[, <name>, <expr>]...)",
    "parameters": "Table; grouping cols; iterators (`CURRENTGROUP()`)",
    "purpose": "Performs grouping without context transition.",
    "pitfall": "Requires `CURRENTGROUP()` inside aggregations (`SUMX`, `COUNTX`).",
    "id": 47
  },
  {
    "name": "GENERATE",
    "category": "Table Shaping",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "GENERATE(<table1>, <table2>)",
    "parameters": "2 table expressions",
    "purpose": "Evaluates table2 for each row of table1 (Cross Apply).",
    "pitfall": "Excludes rows of table1 where table2 evaluates to empty.",
    "id": 48
  },
  {
    "name": "GENERATEALL",
    "category": "Table Shaping",
    "priority": "\ud83d\udd35",
    "defaultStatus": "PLANNED",
    "syntax": "GENERATEALL(<table1>, <table2>)",
    "parameters": "2 table expressions",
    "purpose": "Outer Apply: keeps rows of table1 even if table2 is empty.",
    "pitfall": "Produces null columns for unmatched table1 records.",
    "id": 49
  },
  {
    "name": "UNION",
    "category": "Table Shaping",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "UNION(<table1>, <table2>[, ...])",
    "parameters": "Compatible table expressions",
    "purpose": "Appends rows from multiple tables together.",
    "pitfall": "Does not deduplicate; columns matched by position, not by name.",
    "id": 50
  },
  {
    "name": "INTERSECT",
    "category": "Table Shaping",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "INTERSECT(<table1>, <table2>)",
    "parameters": "2 table expressions",
    "purpose": "Returns common rows present in both tables.",
    "pitfall": "Tables must have identical number of columns.",
    "id": 51
  },
  {
    "name": "EXCEPT",
    "category": "Table Shaping",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "EXCEPT(<table1>, <table2>)",
    "parameters": "2 table expressions",
    "purpose": "Returns rows in table1 that do not exist in table2.",
    "pitfall": "Column order must match; retains duplicates from table1.",
    "id": 52
  },
  {
    "name": "CROSSJOIN",
    "category": "Table Shaping",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "CROSSJOIN(<table1>, <table2>[, ...])",
    "parameters": "2 or more table expressions",
    "purpose": "Cartesian product of all rows.",
    "pitfall": "Explodes in memory if input tables have high cardinality.",
    "id": 53
  },
  {
    "name": "ROW",
    "category": "Table Shaping",
    "priority": "\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "ROW(<name>, <expression>[, ...])",
    "parameters": "Name and scalar value pairs",
    "purpose": "Creates single-row table with specified columns and values.",
    "pitfall": "Useful for passing single-row virtual test tables.",
    "id": 54
  },
  {
    "name": "DATATABLE",
    "category": "Table Shaping",
    "priority": "\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "DATATABLE(<col1>, <type1>..., { {val1, ...} })",
    "parameters": "Column definitions + literal row values",
    "purpose": "Hardcodes static in-memory lookup table.",
    "pitfall": "Use only for small static disconnected parameter tables.",
    "id": 55
  },
  {
    "name": "CALENDAR",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "CALENDAR(<start_date>, <end_date>)",
    "parameters": "2 date expressions",
    "purpose": "Returns single-column table of contiguous dates.",
    "pitfall": "Must be marked as Official Date Table in Power BI.",
    "id": 56
  },
  {
    "name": "CALENDARAUTO",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "CALENDARAUTO([<fiscal_month>])",
    "parameters": "Optional integer fiscal year-end month",
    "purpose": "Generates calendar spanning all dates in model.",
    "pitfall": "Scans entire model; rogue birthdates/logs can expand table to 100+ years.",
    "id": 57
  },
  {
    "name": "DATE",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "DATE(<year>, <month>, <day>)",
    "parameters": "Integers for year, month, day",
    "purpose": "Assembles valid datetime scalar.",
    "pitfall": "Month values > 12 automatically roll over into subsequent year.",
    "id": 58
  },
  {
    "name": "YEAR / MONTH / DAY",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "YEAR(<date>), etc.",
    "parameters": "Date expression",
    "purpose": "Extracts integer components of a date.",
    "pitfall": "For display, create formatted textual columns in date table.",
    "id": 59
  },
  {
    "name": "QUARTER / WEEKNUM",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "QUARTER(<date>), WEEKNUM(<date>[, <type>])",
    "parameters": "Date expression; optional start day rule",
    "purpose": "Returns quarter (1\u20134) or week of year (1\u201354).",
    "pitfall": "Ensure week numbering convention matches enterprise calendar (ISO vs US).",
    "id": 60
  },
  {
    "name": "WEEKDAY",
    "category": "Date & Time",
    "priority": "\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "WEEKDAY(<date>[, <return_type>])",
    "parameters": "Date; return type (1=Sun-Sat, 2=Mon-Sun)",
    "purpose": "Returns integer day of week.",
    "pitfall": "Verify return type parameter to align with business working days.",
    "id": 61
  },
  {
    "name": "EDATE",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "EDATE(<start_date>, <months>)",
    "parameters": "Date; integer months offset",
    "purpose": "Shifts date by exact number of months.",
    "pitfall": "Keeps day-of-month where possible; snaps to month end on short months.",
    "id": 62
  },
  {
    "name": "EOMONTH",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "EOMONTH(<start_date>, <months>)",
    "parameters": "Date; integer months offset",
    "purpose": "Returns last day of the month after offset.",
    "pitfall": "`EOMONTH(date, 0)` is the gold standard for month-end normalization.",
    "id": 63
  },
  {
    "name": "TODAY",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "TODAY()",
    "parameters": "None",
    "purpose": "Returns current date at execution.",
    "pitfall": "Volatile function; causes recalculation on model refresh.",
    "id": 64
  },
  {
    "name": "NOW",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "NOW()",
    "parameters": "None",
    "purpose": "Returns current timestamp with time.",
    "pitfall": "Storing high-precision timestamps in fact tables bloats memory.",
    "id": 65
  },
  {
    "name": "FORMAT",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "LEARNING",
    "syntax": "FORMAT(<value>, <format_string>[, <locale>])",
    "parameters": "Scalar value; format code",
    "purpose": "Converts numbers/dates to formatted text.",
    "pitfall": "Converted output becomes string; cannot be aggregated on axes.",
    "id": 66
  },
  {
    "name": "DATEADD",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "DATEADD(<dates>, <number>, <interval>)",
    "parameters": "Date column; integer; `DAY`/`MONTH`/`QUARTER`/`YEAR`",
    "purpose": "Shifts dates by specified interval.",
    "pitfall": "Requires contiguous date table with no gaps.",
    "id": 67
  },
  {
    "name": "SAMEPERIODLASTYEAR",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "SAMEPERIODLASTYEAR(<dates>)",
    "parameters": "Date column",
    "purpose": "Shifts selection exactly 1 year back.",
    "pitfall": "Equivalent to `DATEADD(dates, -1, YEAR)`.",
    "id": 68
  },
  {
    "name": "DATESYTD",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "DATESYTD(<dates>[, <year_end_date>])",
    "parameters": "Date column; optional fiscal end (e.g. \"06-30\")",
    "purpose": "Returns set of dates from year-start to current date.",
    "pitfall": "Preferred over `TOTALYTD` because it cleanly composes inside `CALCULATE`.",
    "id": 69
  },
  {
    "name": "DATESQTD",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "DATESQTD(<dates>)",
    "parameters": "Date column",
    "purpose": "Returns dates from quarter-start to current date.",
    "pitfall": "Clear quarter filter must exist in context.",
    "id": 70
  },
  {
    "name": "DATESMTD",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "DATESMTD(<dates>)",
    "parameters": "Date column",
    "purpose": "Returns dates from month-start to current date.",
    "pitfall": "Resets on the first of every month.",
    "id": 71
  },
  {
    "name": "DATESINPERIOD",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "DATESINPERIOD(<dates>, <start>, <n>, <interval>)",
    "parameters": "Date col; anchor date; offset; interval",
    "purpose": "Computes rolling periods (e.g. Rolling 30 Days, 3 Months).",
    "pitfall": "Pass `MAX(DimDate[Date])` as anchor to roll backwards using negative $n$.",
    "id": 72
  },
  {
    "name": "DATESBETWEEN",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "DATESBETWEEN(<dates>, <start>, <end>)",
    "parameters": "Date col; start date; end date",
    "purpose": "Returns date table between two explicit boundary dates.",
    "pitfall": "Passing `BLANK()` to start date acts as inception-to-date.",
    "id": 73
  },
  {
    "name": "PARALLELPERIOD",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "PARALLELPERIOD(<dates>, <n>, <interval>)",
    "parameters": "Date col; offset; `MONTH`/`QUARTER`/`YEAR`",
    "purpose": "Returns full parallel period irrespective of date slice.",
    "pitfall": "Does not do partial period comparisons (use `DATEADD` instead).",
    "id": 74
  },
  {
    "name": "PREVIOUSMONTH / NEXTMONTH",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "PREVIOUSMONTH(<dates>)",
    "parameters": "Date column",
    "purpose": "Shifts to entire prior or next month.",
    "pitfall": "Returns full month dates even if current filter is mid-month.",
    "id": 75
  },
  {
    "name": "PREVIOUSQUARTER",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "PREVIOUSQUARTER(<dates>)",
    "parameters": "Date column",
    "purpose": "Returns all dates in prior quarter.",
    "pitfall": "Same full-grain behavior as `PREVIOUSMONTH`.",
    "id": 76
  },
  {
    "name": "PREVIOUSYEAR / NEXTYEAR",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "PREVIOUSYEAR(<dates>[, <year_end>])",
    "parameters": "Date column; optional year end date",
    "purpose": "Returns all dates in prior or next year.",
    "pitfall": "Returns complete 365/366 day set.",
    "id": 77
  },
  {
    "name": "TOTALYTD",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "TOTALYTD(<expr>, <dates>[, <filter>][, <year_end>])",
    "parameters": "Expression; dates; optional filter/year end",
    "purpose": "Syntactic sugar for `CALCULATE(expr, DATESYTD(dates))`.",
    "pitfall": "Harder to troubleshoot when combined with additional filters.",
    "id": 78
  },
  {
    "name": "TOTALQTD",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "TOTALQTD(<expr>, <dates>[, <filter>])",
    "parameters": "Expression; dates; optional filter",
    "purpose": "Syntactic sugar for QTD calculation.",
    "pitfall": "Same composition limits as `TOTALYTD`.",
    "id": 79
  },
  {
    "name": "TOTALMTD",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "TOTALMTD(<expr>, <dates>[, <filter>])",
    "parameters": "Expression; dates; optional filter",
    "purpose": "Syntactic sugar for MTD calculation.",
    "pitfall": "Use `CALCULATE(..., DATESMTD(...))` for complex multi-filter models.",
    "id": 80
  },
  {
    "name": "STARTOFMONTH / ENDOFMONTH",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "STARTOFMONTH(<dates>), ENDOFMONTH(<dates>)",
    "parameters": "Date column",
    "purpose": "Returns 1-row date table with start/end date in context.",
    "pitfall": "Returns table, not scalar; use `MIN`/`MAX` if scalar date needed.",
    "id": 81
  },
  {
    "name": "STARTOFQUARTER / ENDOFQUARTER",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "STARTOFQUARTER(<dates>), etc.",
    "parameters": "Date column",
    "purpose": "Returns 1-row date table for quarter boundary.",
    "pitfall": "Table return type.",
    "id": 82
  },
  {
    "name": "STARTOFYEAR / ENDOFYEAR",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "STARTOFYEAR(<dates>), etc.",
    "parameters": "Date column",
    "purpose": "Returns 1-row date table for year boundary.",
    "pitfall": "Table return type.",
    "id": 83
  },
  {
    "name": "OFFSET",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "OFFSET(<delta>[, <rel>][, <orderBy>][, <blanks>][, <partitionBy>])",
    "parameters": "Integer delta; relation; order; partitions",
    "purpose": "Compares current row to previous (-1) or next (+1) row.",
    "pitfall": "Replaces slow `EARLIER` or `RANKX` row-comparison patterns.",
    "id": 84
  },
  {
    "name": "INDEX",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "INDEX(<position>[, <rel>][, <orderBy>][, <blanks>][, <partitionBy>])",
    "parameters": "Absolute/relative position; relation; ordering",
    "purpose": "Returns specific row (e.g. 1st row, last row, $N$-th row).",
    "pitfall": "Positive numbers index from top (1); negative from bottom (-1).",
    "id": 85
  },
  {
    "name": "WINDOW",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "WINDOW(<from>, <from_type>, <to>, <to_type>[, <rel>][, <order>])",
    "parameters": "Boundary offsets; relative/absolute types; order",
    "purpose": "Creates moving windows (e.g., 3-month rolling average).",
    "pitfall": "Far faster than complex `DATESINPERIOD` iterators.",
    "id": 86
  },
  {
    "name": "ORDERBY",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "ORDERBY(<col>[, <order>][, ...])",
    "parameters": "Column; `ASC`/`DESC`",
    "purpose": "Helper syntax specifying sorting order for Window functions.",
    "pitfall": "Only usable inside `INDEX`, `OFFSET`, and `WINDOW`.",
    "id": 87
  },
  {
    "name": "PARTITIONBY",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "PARTITIONBY(<col>[, ...])",
    "parameters": "Partitioning column list",
    "purpose": "Groups window calculations independently (like SQL `PARTITION BY`).",
    "pitfall": "Only usable inside Window function definitions.",
    "id": 88
  },
  {
    "name": "MATCHBY",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "MATCHBY(<col>[, ...])",
    "parameters": "Key columns",
    "purpose": "Matches current row when relation doesn't match original table columns.",
    "pitfall": "Advanced window helper; default usually suffices.",
    "id": 89
  },
  {
    "name": "RUNNINGSUM",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "RUNNINGSUM(<column>[, <reset>])",
    "parameters": "Visual column; optional reset flag",
    "purpose": "Power BI **Visual Calculation** running total on canvas.",
    "pitfall": "Visual calculations exist only on the visual, not in semantic model.",
    "id": 90
  },
  {
    "name": "MOVINGAVERAGE",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "MOVINGAVERAGE(<column>, <windowSize>[, <reset>])",
    "parameters": "Visual column; integer window size",
    "purpose": "Power BI **Visual Calculation** moving average.",
    "pitfall": "Visual calculation only.",
    "id": 91
  },
  {
    "name": "COLLAPSE / EXPAND",
    "category": "Date & Time",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "COLLAPSE([<level>]), EXPAND([<level>])",
    "parameters": "Hierarchy axis level",
    "purpose": "Navigates visual calculation matrix levels dynamically.",
    "pitfall": "Visual calculation only.",
    "id": 92
  },
  {
    "name": "PATH",
    "category": "Parent-Child",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "PATH(<child_key>, <parent_key>)",
    "parameters": "Child ID column; Parent ID column",
    "purpose": "Generates pipe-delimited string (`101\\",
    "pitfall": "105\\",
    "id": 93
  },
  {
    "name": "PATHITEM",
    "category": "Parent-Child",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "PATHITEM(<path>, <position>[, <type>])",
    "parameters": "Path string; integer level; `TEXT`/`INTEGER`",
    "purpose": "Extracts entity ID at specific hierarchy depth (Level 1, Level 2).",
    "pitfall": "Position out of bounds returns BLANK.",
    "id": 94
  },
  {
    "name": "PATHCONTAINS",
    "category": "Parent-Child",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "PATHCONTAINS(<path>, <item>)",
    "parameters": "Path string; search ID",
    "purpose": "Returns TRUE if item exists anywhere within the lineage path.",
    "pitfall": "Excellent for security access validation in management trees.",
    "id": 95
  },
  {
    "name": "PATHLENGTH",
    "category": "Parent-Child",
    "priority": "\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "PATHLENGTH(<path>)",
    "parameters": "Path string",
    "purpose": "Returns total depth/levels in the hierarchy path.",
    "pitfall": "Use to detect leaf-level records in unbalanced trees.",
    "id": 96
  },
  {
    "name": "SELECTEDMEASURE",
    "category": "Parent-Child",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "SELECTEDMEASURE()",
    "parameters": "None",
    "purpose": "References whichever measure is currently being evaluated.",
    "pitfall": "Only valid inside Calculation Items in Calculation Groups.",
    "id": 97
  },
  {
    "name": "SELECTEDMEASURENAME",
    "category": "Parent-Child",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "SELECTEDMEASURENAME()",
    "parameters": "None",
    "purpose": "Returns string name of the currently evaluated measure.",
    "pitfall": "Use inside `SWITCH` to apply calculation items conditionally.",
    "id": 98
  },
  {
    "name": "ISSELECTEDMEASURE",
    "category": "Parent-Child",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "ISSELECTEDMEASURE(<measure1>[, ...])",
    "parameters": "List of measure references",
    "purpose": "Returns TRUE if current measure is in the whitelist.",
    "pitfall": "Prevents non-additive measures (e.g. Margin %) from invalid operations.",
    "id": 99
  },
  {
    "name": "SELECTEDMEASUREFORMATSTRING",
    "category": "Parent-Child",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "SELECTEDMEASUREFORMATSTRING()",
    "parameters": "None",
    "purpose": "Retrieves original format string of the measure.",
    "pitfall": "Use when altering format dynamically in calculation item.",
    "id": 100
  },
  {
    "name": "Dynamic Format Strings",
    "category": "Parent-Child",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "Measure Format Property DAX expression",
    "parameters": "DAX returning formatting string (e.g. `\"$#,##0\"`)",
    "purpose": "Dynamic currency conversions, scaling ($K, $M), or units.",
    "pitfall": "Configured per-measure in Model View.",
    "id": 101
  },
  {
    "name": "USERPRINCIPALNAME",
    "category": "Parent-Child",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "USERPRINCIPALNAME()",
    "parameters": "None",
    "purpose": "Returns Azure AD / Entra ID login email of the user viewing report.",
    "pitfall": "In Power BI Desktop returns local domain\\user; test with \"View As\".",
    "id": 102
  },
  {
    "name": "USERNAME",
    "category": "Parent-Child",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "USERNAME()",
    "parameters": "None",
    "purpose": "Returns user domain identity or email depending on deployment.",
    "pitfall": "Prefer `USERPRINCIPALNAME()` for modern cloud cloud-identity RLS.",
    "id": 103
  },
  {
    "name": "CUSTOMDATA",
    "category": "Parent-Child",
    "priority": "\u2b50\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "CUSTOMDATA()",
    "parameters": "None",
    "purpose": "Reads connection string parameter passed in Power BI Embedded.",
    "pitfall": "Only applicable in Power BI Embedded or multi-tenant app architectures.",
    "id": 104
  },
  {
    "name": "INFO.TABLES",
    "category": "Parent-Child",
    "priority": "\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "INFO.TABLES()",
    "parameters": "None",
    "purpose": "Returns schema table list via DAX Query View.",
    "pitfall": "Query View / documentation only; cannot be used in visual measures.",
    "id": 105
  },
  {
    "name": "INFO.MEASURES",
    "category": "Parent-Child",
    "priority": "\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "INFO.MEASURES()",
    "parameters": "None",
    "purpose": "Returns all measure names, expressions, and descriptions in model.",
    "pitfall": "Ideal for automated data dictionary generation.",
    "id": 106
  },
  {
    "name": "INFO.RELATIONSHIPS",
    "category": "Parent-Child",
    "priority": "\u2b50",
    "defaultStatus": "PLANNED",
    "syntax": "INFO.RELATIONSHIPS()",
    "parameters": "None",
    "purpose": "Returns metadata on all model relationships and cardinalities.",
    "pitfall": "Auditing models for inactive or bi-directional joins.",
    "id": 107
  },
  {
    "name": "VAR",
    "category": "Parent-Child",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "VAR <name> = <expr>",
    "parameters": "Variable name + expression",
    "purpose": "Evaluates expression in current context and caches constant scalar/table.",
    "pitfall": "**Variables are immutable constants!** They do not recalculate inside loops.",
    "id": 108
  },
  {
    "name": "RETURN",
    "category": "Parent-Child",
    "priority": "\u2b50\u2b50\u2b50",
    "defaultStatus": "DONE",
    "syntax": "RETURN <expr>",
    "parameters": "Final expression",
    "purpose": "Returns final measure result utilizing declared variables.",
    "pitfall": "Must immediately follow variable declarations.",
    "id": 109
  }
];

export interface DaxRecipeSimulationRow {
  label: string;
  baseVal: string;
  metricVal: string;
  contextNote?: string;
  isTotal?: boolean;
}

export interface DaxRecipe {
  id: string;
  title: string;
  category: string;
  tag: string;
  templateCode: string;
  naiveCode: string;
  naiveCritique: string;
  explanation: string;
  gotcha: string;
  seRating: 'Pure Storage Engine' | 'Hybrid SE/FE' | 'Formula Engine Heavy';
  visualSimulation: {
    title: string;
    dimHeader: string;
    baseHeader: string;
    metricHeader: string;
    rows: DaxRecipeSimulationRow[];
  };
}

export const DAX_RECIPES: DaxRecipe[] = [
  {
    id: "cumulative-sales",
    title: "Cumulative / Running Sales Beside Each Row",
    category: "Time Intelligence & Row Context",
    tag: "Running Total",
    templateCode: `-- Method 1: Standard Running Total by Date
Cumulative Sales by Date = 
VAR CurrentDate = MAX({{DATE_TABLE}}[{{DATE_COL}}])
RETURN
    CALCULATE(
        [{{METRIC}}],
        FILTER(
            ALLSELECTED({{DATE_TABLE}}[{{DATE_COL}}]),
            {{DATE_TABLE}}[{{DATE_COL}}] <= CurrentDate
        )
    )

-- Method 2: Modern Native WINDOW Function (2024+ Ultra-Fast)
Cumulative Sales (Window) = 
CALCULATE(
    [{{METRIC}}],
    WINDOW(
        1, ABS,
        0, REL,
        ALLSELECTED({{DATE_TABLE}}[{{DATE_COL}}]),
        ORDERBY({{DATE_TABLE}}[{{DATE_COL}}], ASC)
    )
)`,
    naiveCode: `-- Anti-Pattern: Filtering full fact table row-by-row
Cumulative Sales (Naive) = 
CALCULATE(
    SUM({{FACT}}[{{METRIC}}]),
    FILTER(
        ALL({{FACT}}),
        {{FACT}}[{{DATE_COL}}] <= MAX({{FACT}}[{{DATE_COL}}])
    )
)`,
    naiveCritique: "Forces VertiPaq to do a full un-indexed scan of millions of fact rows in single-threaded Formula Engine. In visuals with slicers, it completely blows away user filters.",
    explanation: "Calculates cumulative sales up to the current date or transaction row. Method 2 using WINDOW is up to 5x faster than FILTER(ALL(...)) because it utilizes VertiPaq index-level slicing.",
    gotcha: "Always use ALLSELECTED instead of ALL if you want the running total to respect external slicers (like year/product filters).",
    seRating: "Pure Storage Engine",
    visualSimulation: {
      title: "Simulated Matrix Visual: Monthly Cumulative Run",
      dimHeader: "Month",
      baseHeader: "Monthly Sales",
      metricHeader: "Cumulative Sales",
      rows: [
        { label: "Jan 2026", baseVal: "$120,000", metricVal: "$120,000", contextNote: "Month 1 baseline" },
        { label: "Feb 2026", baseVal: "$180,000", metricVal: "$300,000", contextNote: "120k + 180k" },
        { label: "Mar 2026", baseVal: "$150,000", metricVal: "$450,000", contextNote: "300k + 150k" },
        { label: "Apr 2026", baseVal: "$210,000", metricVal: "$660,000", contextNote: "450k + 210k" },
        { label: "Total", baseVal: "$660,000", metricVal: "$660,000", contextNote: "Cumulative matches full period", isTotal: true }
      ]
    }
  },
  {
    id: "prior-year-growth",
    title: "Prior Year & Year-over-Year Growth %",
    category: "Time Intelligence",
    tag: "YoY Growth",
    templateCode: `-- 1. Base Measure
Total {{METRIC}} = SUM({{FACT}}[{{METRIC}}])

-- 2. Prior Year (Resilient)
{{METRIC}} PY = 
CALCULATE(
    [Total {{METRIC}}],
    SAMEPERIODLASTYEAR({{DATE_TABLE}}[{{DATE_COL}}])
)

-- 3. YoY Growth %
YoY {{METRIC}} Growth % = 
VAR CurrentVal = [Total {{METRIC}}]
VAR PriorVal = [{{METRIC}} PY]
RETURN
    DIVIDE(CurrentVal - PriorVal, PriorVal)`,
    naiveCode: `-- Anti-Pattern: Hardcoded year subtraction
Sales PY (Naive) = 
CALCULATE(
    SUM({{FACT}}[{{METRIC}}]),
    FILTER({{DATE_TABLE}}, {{DATE_TABLE}}[Year] = YEAR(TODAY()) - 1)
)`,
    naiveCritique: "Fails completely in multi-year visuals, breaks when filtering quarters/months, and crashes on leap years or partial month comparisons.",
    explanation: "Standard YoY growth pattern using SAMEPERIODLASTYEAR. Protects against divide-by-zero using DIVIDE and respects leap years.",
    gotcha: "Requires a contiguous Date dimension marked as an Official Date Table in Power BI.",
    seRating: "Pure Storage Engine",
    visualSimulation: {
      title: "Simulated Visual: Prior Year Comparison",
      dimHeader: "Quarter",
      baseHeader: "Current Sales",
      metricHeader: "YoY Growth %",
      rows: [
        { label: "Q1", baseVal: "$450,000", metricVal: "+12.5%", contextNote: "PY was $400k" },
        { label: "Q2", baseVal: "$520,000", metricVal: "+8.3%", contextNote: "PY was $480k" },
        { label: "Q3", baseVal: "$490,000", metricVal: "-2.0%", contextNote: "PY was $500k" },
        { label: "Total", baseVal: "$1,460,000", metricVal: "+6.1%", contextNote: "Full year pace", isTotal: true }
      ]
    }
  },
  {
    id: "safe-percent-total",
    title: "Safe % of Visual Total & Matrix Parent",
    category: "Filter Context",
    tag: "% of Total",
    templateCode: `-- Safe % of Selected Total
{{METRIC}} % of Total = 
VAR CurrentVal = [Total {{METRIC}}]
VAR TotalSelected = 
    CALCULATE(
        [Total {{METRIC}}],
        ALLSELECTED({{DIM_TABLE}})
    )
RETURN
    DIVIDE(CurrentVal, TotalSelected)

-- Advanced: Multi-Level Matrix % of Parent with ISINSCOPE
{{METRIC}} % of Parent = 
VAR CurrentVal = [Total {{METRIC}}]
RETURN
    SWITCH(
        TRUE(),
        ISINSCOPE({{DIM_TABLE}}[SubCategory]),
        DIVIDE(CurrentVal, CALCULATE([Total {{METRIC}}], ALLSELECTED({{DIM_TABLE}}[SubCategory]))),
        ISINSCOPE({{DIM_TABLE}}[Category]),
        DIVIDE(CurrentVal, CALCULATE([Total {{METRIC}}], ALLSELECTED({{DIM_TABLE}}[Category]))),
        1 -- Grand Total
    )`,
    naiveCode: `-- Anti-Pattern: Using raw ALL()
Sales % of Total (Naive) = 
[Total {{METRIC}}] / CALCULATE([Total {{METRIC}}], ALL({{FACT}}))`,
    naiveCritique: "Using ALL() ignores user slicers (e.g. selecting USA still divides by global sales, giving 3% instead of 100%). Using raw '/' crashes on zero.",
    explanation: "Computes contribution percentage across visual coordinates while respecting slicers. ISINSCOPE handles multi-level Matrix hierarchies safely.",
    gotcha: "Target the specific dimension table inside ALLSELECTED rather than the entire model to avoid unexpected subtotal blowouts.",
    seRating: "Hybrid SE/FE",
    visualSimulation: {
      title: "Simulated Matrix Visual: % of Category Parent",
      dimHeader: "Category / Item",
      baseHeader: "Category Sales",
      metricHeader: "% of Parent Total",
      rows: [
        { label: "Electronics", baseVal: "$600,000", metricVal: "60.0%", contextNote: "Category 1" },
        { label: "  - Laptops", baseVal: "$400,000", metricVal: "66.7%", contextNote: "400k / 600k" },
        { label: "  - Phones", baseVal: "$200,000", metricVal: "33.3%", contextNote: "200k / 600k" },
        { label: "Furniture", baseVal: "$400,000", metricVal: "40.0%", contextNote: "Category 2" },
        { label: "Total", baseVal: "$1,000,000", metricVal: "100.0%", contextNote: "Total = 100%", isTotal: true }
      ]
    }
  },
  {
    id: "matrix-subtotal-fix",
    title: "Fix Wrong Matrix Total (The DAX Subtotal Trap)",
    category: "Table Shaping & Context",
    tag: "Subtotal Fix",
    templateCode: `-- The Problem: Average or Ratios calculate at total grain rather than summing rows!
-- The Fix: SUMX over VALUES to force row-level evaluation at the total line:

Corrected Total {{METRIC}} = 
VAR IsSubtotalLevel = NOT(HASONEVALUE({{DIM_TABLE}}[ProductName]))
RETURN
    IF(
        IsSubtotalLevel,
        -- Force iteration across visible rows at subtotal level
        SUMX(
            VALUES({{DIM_TABLE}}[ProductName]),
            [RowLevelRateMeasure]
        ),
        -- Normal row evaluation
        [RowLevelRateMeasure]
    )`,
    naiveCode: `-- Anti-Pattern: Direct Measure in Matrix
Average Price (Naive) = AVERAGE({{FACT}}[UnitPrice])`,
    naiveCritique: "In a Matrix visual, the Total line does not sum the averages! It takes the overall average of all transactions, confounding business users.",
    explanation: "The single most common DAX bug in client reports. Uses HASONEVALUE or ISINSCOPE to detect the Total row and re-weights it with SUMX(VALUES(...)).",
    gotcha: "Testing with HASONEVALUE ensures the row calculation executes quickly while the total line computes accurately.",
    seRating: "Hybrid SE/FE",
    visualSimulation: {
      title: "Simulated Visual: Naive Total vs. Fixed Total",
      dimHeader: "Product",
      baseHeader: "Units Sold",
      metricHeader: "Weighted Avg Price",
      rows: [
        { label: "Product A", baseVal: "100 units", metricVal: "$10.00", contextNote: "Row 1" },
        { label: "Product B", baseVal: "10 units", metricVal: "$50.00", contextNote: "Row 2" },
        { label: "Naive Total (Bad)", baseVal: "110 units", metricVal: "$30.00 (Wrong!)", contextNote: "Simple avg of 10 & 50" },
        { label: "Fixed Total (Correct)", baseVal: "110 units", metricVal: "$13.64 (Weighted)", contextNote: "Total dollars / Total units", isTotal: true }
      ]
    }
  },
  {
    id: "mom-offset",
    title: "Month-over-Month Growth with OFFSET (Modern 2024+)",
    category: "Window Functions",
    tag: "Modern MoM",
    templateCode: `-- Prior Month Sales via Native 2024 OFFSET
Sales PM (Offset) = 
CALCULATE(
    [Total {{METRIC}}],
    OFFSET(
        -1,
        ALLSELECTED({{DATE_TABLE}}[YearMonth], {{DATE_TABLE}}[MonthNumber]),
        ORDERBY({{DATE_TABLE}}[MonthNumber], ASC)
    )
)

MoM {{METRIC}} Growth % = 
VAR CurrentVal = [Total {{METRIC}}]
VAR PriorMonthVal = [Sales PM (Offset)]
RETURN
    DIVIDE(CurrentVal - PriorMonthVal, PriorMonthVal)`,
    naiveCode: `-- Anti-Pattern: EARLIER() or Max Date Subtraction
Sales PM (Legacy) = 
CALCULATE(
    SUM({{FACT}}[{{METRIC}}]),
    FILTER(
        ALL({{DATE_TABLE}}),
        {{DATE_TABLE}}[MonthNumber] = EARLIER({{DATE_TABLE}}[MonthNumber]) - 1
    )
)`,
    naiveCritique: "EARLIER() is legacy, slow, cannot handle December-to-January transitions, and forces multi-pass Formula Engine materialization.",
    explanation: "Replaces slow EARLIER or complex date filters with native 2023+ OFFSET function. Executes directly inside the VertiPaq engine.",
    gotcha: "The relation in OFFSET must include all columns used in visual group-by and ordering.",
    seRating: "Pure Storage Engine",
    visualSimulation: {
      title: "Simulated Visual: MoM Sequence",
      dimHeader: "Month",
      baseHeader: "Current Sales",
      metricHeader: "MoM Growth %",
      rows: [
        { label: "2026-01", baseVal: "$100,000", metricVal: "N/A", contextNote: "Inception period" },
        { label: "2026-02", baseVal: "$125,000", metricVal: "+25.0%", contextNote: "+$25k vs Jan" },
        { label: "2026-03", baseVal: "$110,000", metricVal: "-12.0%", contextNote: "-$15k vs Feb" }
      ]
    }
  },
  {
    id: "dynamic-topn-others",
    title: "Dynamic Top N with 'Others' Rollup",
    category: "Iterators & Virtual Tables",
    tag: "Top N + Others",
    templateCode: `-- Dynamic Top N + Others Rollup
{{METRIC}} Top N and Others = 
VAR TopNSelected = 5 -- Or read from disconnected parameter: [Selected Top N Value]
VAR VisibleEntities = VALUES({{DIM_TABLE}}[EntityName])
VAR TopEntities = 
    TOPN(
        TopNSelected, 
        ALLSELECTED({{DIM_TABLE}}[EntityName]), 
        [Total {{METRIC}}], 
        DESC
    )
VAR IsInTopN = 
    NOT(ISEMPTY(INTERSECT(VisibleEntities, TopEntities)))
VAR IsOtherRow = 
    SELECTEDVALUE({{DIM_TABLE}}[EntityName]) = "Others"
RETURN
    SWITCH(
        TRUE(),
        IsInTopN, [Total {{METRIC}}],
        IsOtherRow, 
            CALCULATE(
                [Total {{METRIC}}], 
                EXCEPT(ALLSELECTED({{DIM_TABLE}}[EntityName]), TopEntities)
            ),
        BLANK()
    )`,
    naiveCode: `-- Anti-Pattern: Visual Filter Top N
-- Standard Top N visual filter excludes all other rows, meaning the visual total only sums the top N rather than the business 100%.`,
    naiveCritique: "Standard Power BI visual Top N filters alter the grand total, preventing executives from seeing what percentage of the company revenue is outside the Top N.",
    explanation: "The gold standard executive pattern. Combines TOPN, EXCEPT, and a disconnected parameter table to roll up non-qualifying records into an 'Others' summary line.",
    gotcha: "Requires a unioned dimension or disconnected parameter table that includes the 'Others' label.",
    seRating: "Hybrid SE/FE",
    visualSimulation: {
      title: "Simulated Matrix Visual: Top 3 + Others",
      dimHeader: "Customer",
      baseHeader: "Revenue",
      metricHeader: "Share of Total",
      rows: [
        { label: "1. ACME Corp", baseVal: "$400,000", metricVal: "40.0%", contextNote: "Rank 1" },
        { label: "2. Global Tech", baseVal: "$250,000", metricVal: "25.0%", contextNote: "Rank 2" },
        { label: "3. Apex Logistics", baseVal: "$150,000", metricVal: "15.0%", contextNote: "Rank 3" },
        { label: "Others (150 clients)", baseVal: "$200,000", metricVal: "20.0%", contextNote: "Auto-rolled up" },
        { label: "Total", baseVal: "$1,000,000", metricVal: "100.0%", contextNote: "True 100% total preserved", isTotal: true }
      ]
    }
  },
  {
    id: "dynamic-rls",
    title: "Dynamic Row-Level Security (RLS) with Org Tree",
    category: "Security & Governance",
    tag: "Enterprise RLS",
    templateCode: `-- Simple Direct Email Filtering (in Manage Roles):
[UserEmail] = USERPRINCIPALNAME()

-- Advanced Organizational Hierarchy (Managers see all subordinates):
VAR CurrentUserEmail = USERPRINCIPALNAME()
VAR CurrentUserKey = 
    LOOKUPVALUE(DimEmployee[EmployeeID], DimEmployee[Email], CurrentUserEmail)
RETURN
    PATHCONTAINS(
        DimEmployee[HierarchyPath], 
        CurrentUserKey
    )`,
    naiveCode: `-- Anti-Pattern: Multiple static roles per manager
-- Creating 45 different Power BI roles (e.g. 'Manager_John', 'Manager_Sarah') and maintaining user assignments manually.`,
    naiveCritique: "Unmaintainable in enterprise BI. Every organizational promotion or departure requires editing PBIX files and redeploying.",
    explanation: "Dynamic security filters data at query time based on who is logged into Power BI Service using Entra ID (Azure AD).",
    gotcha: "In Power BI Desktop, always test with Modeling -> View As Roles. Ensure DimEmployee[HierarchyPath] is pre-calculated with PATH(EmployeeID, ManagerID).",
    seRating: "Pure Storage Engine",
    visualSimulation: {
      title: "Simulated RLS Matrix: Director View",
      dimHeader: "Logged-in User",
      baseHeader: "Filtered Employees",
      metricHeader: "Visible Revenue",
      rows: [
        { label: "Director (Sarah)", baseVal: "Self + 12 Subordinates", metricVal: "$1,450,000", contextNote: "Full division access" },
        { label: "Sales Rep (Tom)", baseVal: "Self Only", metricVal: "$120,000", contextNote: "Only Tom's pipeline" }
      ]
    }
  }
];


