# MyCES — DAX & Power BI Mastery Tracker & Reference Manual

> **A systematic career execution tracker, architectural reference, and practice catalog for mastering DAX and Power BI (2024–2026 Standard).**
> 
> **Status:** 🟢 Completed & Practiced | 🟡 Introduced / In Progress | ⚪ Planned  
> **Priority:** ⭐⭐⭐ Essential (Core / Must Know) | ⭐⭐ Important (Industry Standard) | ⭐ Useful | 🔵 Advanced / Specialized

---

## 🧭 Quick Table of Contents
1. [Mastery Framework & Progress Dashboard](#1-mastery-framework--progress-dashboard)
2. [Master DAX Functions Catalog (#1 to #108)](#2-master-dax-functions-catalog)
   - [2.1 Foundation, Scalar & Math (#1–10)](#21-foundation-scalar--math)
   - [2.2 Filter Context & Modifiers (#11–24)](#22-filter-context--modifiers)
   - [2.3 Context Inspection & Hierarchy Detection (#25–29)](#23-context-inspection--hierarchy-detection)
   - [2.4 Iterators & Row Context Evaluation (#30–39)](#24-iterators--row-context-evaluation)
   - [2.5 Table Shaping & Virtual Tables (#40–54)](#25-table-shaping--virtual-tables)
   - [2.6 Date & Calendar Arithmetic (#55–65)](#26-date--calendar-arithmetic)
   - [2.7 Standard Time Intelligence (#66–82)](#27-standard-time-intelligence)
   - [2.8 Modern Window Functions & Visual Calcs (#83–91)](#28-modern-window-functions--visual-calculations)
   - [2.9 Parent-Child Hierarchies (#92–95)](#29-parent-child-hierarchies)
   - [2.10 Calculation Groups & Dynamic Formats (#96–100)](#210-calculation-groups--dynamic-formatting)
   - [2.11 Dynamic Security & Metadata (#101–108)](#211-dynamic-security-rls--metadata)
3. [Battle-Tested DAX Recipe Library](#3-battle-tested-dax-recipe-library)
4. [Enterprise Power BI Technical Curriculum](#4-enterprise-power-bi-technical-curriculum)
5. [Weekly Execution Sprint Plan](#5-weekly-execution-sprint-plan)

---

# 1. Mastery Framework & Progress Dashboard

### The 10-Step Mastery Rule
```
Seen → Understand Purpose → Master Parameters → Write Syntax → Test on Real Data
  → Combine with Context → Debug Edge Cases → Explain the "Why" → Know When NOT to Use → MASTERED
```

### Current Status Tracker
* **Total Tracked Functions:** 108
* **🟢 Completed & Practiced:** 44 (40.7%)
* **🟡 In Progress / Partial:** 2 (1.9%)
* **⚪ Planned Next:** 62 (57.4%)
* **Target:** 100% of ⭐⭐⭐ (Essential) and ⭐⭐ (Important) mastered for Enterprise Analyst / BI Engineer roles.

---

# 2. Master DAX Functions Catalog

### 2.1 Foundation, Scalar & Math
| # | Function | Status | Priority | Syntax | Parameters | Purpose | Pitfalls / When NOT to Use |
|---:|---|:---:|:---:|---|---|---|---|
| 1 | `SUM` | 🟢 | ⭐⭐⭐ | `SUM(<column>)` | Numeric column | Adds numeric values. | Cannot take row-by-row expressions (use `SUMX`). |
| 2 | `COUNT` | 🟢 | ⭐⭐⭐ | `COUNT(<column>)` | Column (numbers, dates, strings) | Counts non-blank rows with valid values. | Counts only rows with values; use `COUNTROWS` for table rows. |
| 3 | `COUNTROWS` | 🟢 | ⭐⭐⭐ | `COUNTROWS([<table>])` | Table expression | Counts total rows in table or context. | Much faster than `COUNT(<col>)` on fact tables. |
| 4 | `DISTINCTCOUNT` | 🟢 | ⭐⭐⭐ | `DISTINCTCOUNT(<column>)` | Column | Counts distinct values including blank if present. | Slower on high-cardinality columns; consider `DISTINCTCOUNTNOBLANK`. |
| 5 | `DIVIDE` | 🟢 | ⭐⭐⭐ | `DIVIDE(<num>, <denom>[, <alt>])` | Scalar expressions; optional fallback | Safe division returning alternate or BLANK on /0. | Never use `/` in production measures; always use `DIVIDE`. |
| 6 | `IF` | 🟢 | ⭐⭐⭐ | `IF(<test>, <true>[, <false>])` | Boolean test; scalar outputs | Conditional evaluation. | Nested `IF` statements become unreadable; prefer `SWITCH(TRUE())`. |
| 7 | `SWITCH` | 🟢 | ⭐⭐⭐ | `SWITCH(<expr>, <val>, <res>[, ...][, <else>])` | Scalar expression + matching pairs | Evaluates against multiple fixed values. | Limited to equality comparisons on one value. |
| 8 | `SWITCH(TRUE())` | 🟢 | ⭐⭐⭐ | `SWITCH(TRUE(), <cond1>, <res1>[, ...])` | Boolean conditions + results | Evaluates complex multi-condition logic top-down. | Conditions evaluate sequentially; order matters for performance. |
| 9 | `COALESCE` | 🟢 | ⭐⭐ | `COALESCE(<expr1>, <expr2>[, ...])` | List of scalar expressions | Returns first non-BLANK value in arguments. | Ensure data types of arguments match or can implicitly convert. |
| 10 | `ISBLANK` | ⚪ | ⭐⭐ | `ISBLANK(<val>)` | Scalar value / expression | Checks if an expression evaluates to BLANK. | In DAX, `val = 0` evaluates to TRUE for BLANK; use `ISBLANK` to be explicit. |

---

### 2.2 Filter Context & Modifiers
| # | Function | Status | Priority | Syntax | Parameters | Purpose | Pitfalls / When NOT to Use |
|---:|---|:---:|:---:|---|---|---|---|
| 11 | `CALCULATE` | 🟢 | ⭐⭐⭐ | `CALCULATE(<expr>[, <filter>...])` | Scalar expression; boolean/table filters/modifiers | Evaluates expression in a modified filter context; triggers context transition. | Costly inside nested row iterators if triggered unnecessarily. |
| 12 | `CALCULATETABLE` | ⚪ | ⭐⭐⭐ | `CALCULATETABLE(<table>[, <filter>...])` | Table expression; filter modifiers | Modifies filter context and returns a table. | Used when constructing virtual tables under modified context. |
| 13 | `FILTER` | 🟢 | ⭐⭐⭐ | `FILTER(<table>, <condition>)` | Table; boolean row condition | Iterates table and filters rows where condition is TRUE. | Do not filter entire fact table: `FILTER(Sales, ...)` is an anti-pattern. |
| 14 | `ALL` | 🟢 | ⭐⭐⭐ | `ALL([<table> \| <col>...])` | Table or column list | Removes filters from target and returns distinct values/rows. | When used as a modifier inside `CALCULATE`, it clears filters. |
| 15 | `REMOVEFILTERS` | 🟢 | ⭐⭐⭐ | `REMOVEFILTERS([<table> \| <col>...])` | Table or column list | Explicit filter removal modifier inside `CALCULATE`. | Cannot be used as a standalone table expression (unlike `ALL`). |
| 16 | `ALLSELECTED` | ⚪ | ⭐⭐⭐ | `ALLSELECTED([<table> \| <col>...])` | Table or column list | Preserves visual/slicer filters while clearing inner table axis filters. | Complex edge cases with shadow context transitions. |
| 17 | `ALLEXCEPT` | 🟢 | ⭐⭐ | `ALLEXCEPT(<table>, <col>...)` | Table + columns to keep filters on | Clears filters on table except specified columns. | Sensitive to newly added columns in dimension tables. |
| 18 | `KEEPFILTERS` | 🟢 | ⭐⭐⭐ | `KEEPFILTERS(<expr>)` | Filter / table expression | Changes filter behavior from overwrite (default) to intersection. | Use to avoid clearing existing slicer filters during overrides. |
| 19 | `USERELATIONSHIP` | ⚪ | ⭐⭐⭐ | `USERELATIONSHIP(<col1>, <col2>)` | Related columns in existing inactive link | Activates inactive relationship for duration of `CALCULATE`. | Both columns must be part of an existing relationship in model. |
| 20 | `CROSSFILTER` | ⚪ | ⭐⭐ | `CROSSFILTER(<col1>, <col2>, <dir>)` | Related columns; `NONE`/`ONE`/`BOTH` | Modifies relationship direction dynamically. | Avoid `BOTH` permanently in models; use `CROSSFILTER` dynamically. |
| 21 | `TREATAS` | ⚪ | ⭐⭐⭐ | `TREATAS(<table_expr>, <col>...)` | In-memory table + target columns | Applies virtual relationships without physical model links. | Faster than `INTERSECT` or `CONTAINS` for disconnected filtering. |
| 22 | `RELATED` | ⚪ | ⭐⭐⭐ | `RELATED(<column>)` | Target column on "one" side | Retrieves single value from related lookup table via row context. | Requires an active physical relationship from many-to-one. |
| 23 | `RELATEDTABLE` | ⚪ | ⭐⭐ | `RELATEDTABLE(<table>)` | Target table on "many" side | Returns all matching rows from related table in current row context. | Creates virtual table; best combined inside `COUNTROWS` or iterators. |
| 24 | `LOOKUPVALUE` | ⚪ | ⭐⭐ | `LOOKUPVALUE(<res>, <search>, <val>[, ...])` | Result column; search pairs; optional fallback | Fetches value without relationship. | Slower than `RELATED`; throws error if multiple matches found. |

---

### 2.3 Context Inspection & Hierarchy Detection
| # | Function | Status | Priority | Syntax | Parameters | Purpose | Pitfalls / When NOT to Use |
|---:|---|:---:|:---:|---|---|---|---|
| 25 | `SELECTEDVALUE` | 🟢 | ⭐⭐⭐ | `SELECTEDVALUE(<col>[, <alt>])` | Column; optional fallback | Returns single selected value or alternate if 0 or 2+ values present. | Shortcut for `IF(HASONEVALUE(col), VALUES(col), alt)`. |
| 26 | `HASONEVALUE` | 🟢 | ⭐⭐ | `HASONEVALUE(<col>)` | Column | Returns TRUE if exactly 1 distinct value remains in filter context. | Returns FALSE on blank rows or total levels. |
| 27 | `ISINSCOPE` | 🟢 | ⭐⭐⭐ | `ISINSCOPE(<col>)` | Column | Detects current level in visual hierarchy (Matrix rows/columns). | Essential for subtotal/grand total ratio calculations. |
| 28 | `ISCROSSFILTERED` | 🟡 | ⭐⭐ | `ISCROSSFILTERED(<tableOrCol>)` | Table or column | Returns TRUE if column/table is filtered directly or via related table. | Returns TRUE even if filter comes from a different dimension. |
| 29 | `ISFILTERED` | ⚪ | ⭐⭐ | `ISFILTERED(<tableOrCol>)` | Table or column | Returns TRUE only if column has direct filters applied. | Does not detect cross-table filter propagation. |

---

### 2.4 Iterators & Row Context Evaluation
| # | Function | Status | Priority | Syntax | Parameters | Purpose | Pitfalls / When NOT to Use |
|---:|---|:---:|:---:|---|---|---|---|
| 30 | `SUMX` | 🟢 | ⭐⭐⭐ | `SUMX(<table>, <expr>)` | Table expression; row expression | Iterates table row-by-row, computes expression, and sums results. | Wrap naked columns in measures or invoke context transition carefully. |
| 31 | `AVERAGEX` | 🟢 | ⭐⭐ | `AVERAGEX(<table>, <expr>)` | Table; row expression | Iterates and averages expression result across rows. | Note: only averages non-blank row results. |
| 32 | `MINX` | 🟢 | ⭐⭐ | `MINX(<table>, <expr>)` | Table; row expression | Finds minimum computed value across iterated rows. | Evaluates expression for every row in table. |
| 33 | `MAXX` | 🟢 | ⭐⭐ | `MAXX(<table>, <expr>)` | Table; row expression | Finds maximum computed value across iterated rows. | High CPU usage on multi-million row tables if un-filtered. |
| 34 | `COUNTX` | ⚪ | ⭐⭐ | `COUNTX(<table>, <expr>)` | Table; row expression | Counts rows where evaluated expression produces non-blank. | To count all rows unconditionally, use `COUNTROWS(table)`. |
| 35 | `MEDIANX` | ⚪ | ⭐⭐ | `MEDIANX(<table>, <expr>)` | Table; row expression | Calculates median of row-level expression. | Resource-intensive; filter input table beforehand. |
| 36 | `PRODUCTX` | ⚪ | 🔵 | `PRODUCTX(<table>, <expr>)` | Table; row expression | Multiplies evaluated expression across rows (compounding). | Negative values or zeroes require careful mathematical handling. |
| 37 | `CONCATENATEX` | ⚪ | ⭐⭐⭐ | `CONCATENATEX(<table>, <expr>[, <delim>[, <order>]])` | Table; expression; delimiter; sorting | Joins row expressions into single concatenated string. | Truncate output if rows exceed thousands to avoid visual slowdown. |
| 38 | `RANKX` | 🟢 | ⭐⭐⭐ | `RANKX(<table>, <expr>[, <val>[, <order>[, <ties>]]])` | Table; expression; optional val/order/ties | Calculates rank of current row expression within table. | Prone to context transition bugs; always wrap measure in `[Measure]`. |
| 39 | `TOPN` | 🟢 | ⭐⭐⭐ | `TOPN(<n>, <table>, <orderExpr>[, <order>...])` | Integer N; table; sort expr; ASC/DESC | Returns top N rows of a table based on sort order. | Returns table, not scalar; must combine with `CALCULATE` or iterators. |

---

### 2.5 Table Shaping & Virtual Tables
| # | Function | Status | Priority | Syntax | Parameters | Purpose | Pitfalls / When NOT to Use |
|---:|---|:---:|:---:|---|---|---|---|
| 40 | `VALUES` | 🟢 | ⭐⭐⭐ | `VALUES(<colOrTable>)` | Column or table | Returns unique values in current context, including Blank row. | Blank row appears if referential integrity violation exists. |
| 41 | `DISTINCT` | 🟢 | ⭐⭐ | `DISTINCT(<colOrTable>)` | Column or table | Returns unique values; ignores relationship blank row. | Use `VALUES` for slicer integrity; `DISTINCT` for strict distinct sets. |
| 42 | `ADDCOLUMNS` | 🟢 | ⭐⭐⭐ | `ADDCOLUMNS(<table>, <name>, <expr>[, ...])` | Table; column name; row expression | Extends table with new calculated virtual columns. | Executes in row context; wrap measures to trigger context transition. |
| 43 | `SELECTCOLUMNS` | 🟢 | ⭐⭐⭐ | `SELECTCOLUMNS(<table>, <name>, <expr>[, ...])` | Table; output names; expressions | Projects specific columns and renames them. | Drops all other original columns not explicitly listed. |
| 44 | `SUMMARIZE` | ⚪ | ⭐⭐⭐ | `SUMMARIZE(<table>, <groupByCol>...)` | Table; grouping columns | Groups table by distinct column combinations. | DO NOT add measure aggregations here; use `ADDCOLUMNS(SUMMARIZE(...))`. |
| 45 | `SUMMARIZECOLUMNS` | ⚪ | ⭐⭐⭐ | `SUMMARIZECOLUMNS(<group>...[, <filter>]...[, <name>, <expr>]...)` | Grouping cols; filter tables; named metrics | Best-in-class grouped aggregation query generator. | Cannot be called within a context transition in measures. |
| 46 | `GROUPBY` | ⚪ | ⭐⭐ | `GROUPBY(<table>, <group>...[, <name>, <expr>]...)` | Table; grouping cols; iterators (`CURRENTGROUP()`) | Performs grouping without context transition. | Requires `CURRENTGROUP()` inside aggregations (`SUMX`, `COUNTX`). |
| 47 | `GENERATE` | 🟢 | ⭐⭐ | `GENERATE(<table1>, <table2>)` | 2 table expressions | Evaluates table2 for each row of table1 (Cross Apply). | Excludes rows of table1 where table2 evaluates to empty. |
| 48 | `GENERATEALL` | ⚪ | 🔵 | `GENERATEALL(<table1>, <table2>)` | 2 table expressions | Outer Apply: keeps rows of table1 even if table2 is empty. | Produces null columns for unmatched table1 records. |
| 49 | `UNION` | ⚪ | ⭐⭐ | `UNION(<table1>, <table2>[, ...])` | Compatible table expressions | Appends rows from multiple tables together. | Does not deduplicate; columns matched by position, not by name. |
| 50 | `INTERSECT` | ⚪ | ⭐⭐ | `INTERSECT(<table1>, <table2>)` | 2 table expressions | Returns common rows present in both tables. | Tables must have identical number of columns. |
| 51 | `EXCEPT` | ⚪ | ⭐⭐ | `EXCEPT(<table1>, <table2>)` | 2 table expressions | Returns rows in table1 that do not exist in table2. | Column order must match; retains duplicates from table1. |
| 52 | `CROSSJOIN` | ⚪ | ⭐⭐ | `CROSSJOIN(<table1>, <table2>[, ...])` | 2 or more table expressions | Cartesian product of all rows. | Explodes in memory if input tables have high cardinality. |
| 53 | `ROW` | ⚪ | ⭐ | `ROW(<name>, <expression>[, ...])` | Name and scalar value pairs | Creates single-row table with specified columns and values. | Useful for passing single-row virtual test tables. |
| 54 | `DATATABLE` | ⚪ | ⭐ | `DATATABLE(<col1>, <type1>..., { {val1, ...} })` | Column definitions + literal row values | Hardcodes static in-memory lookup table. | Use only for small static disconnected parameter tables. |

---

### 2.6 Date & Calendar Arithmetic
| # | Function | Status | Priority | Syntax | Parameters | Purpose | Pitfalls / When NOT to Use |
|---:|---|:---:|:---:|---|---|---|---|
| 55 | `CALENDAR` | 🟢 | ⭐⭐⭐ | `CALENDAR(<start_date>, <end_date>)` | 2 date expressions | Returns single-column table of contiguous dates. | Must be marked as Official Date Table in Power BI. |
| 56 | `CALENDARAUTO` | ⚪ | ⭐⭐⭐ | `CALENDARAUTO([<fiscal_month>])` | Optional integer fiscal year-end month | Generates calendar spanning all dates in model. | Scans entire model; rogue birthdates/logs can expand table to 100+ years. |
| 57 | `DATE` | 🟢 | ⭐⭐ | `DATE(<year>, <month>, <day>)` | Integers for year, month, day | Assembles valid datetime scalar. | Month values > 12 automatically roll over into subsequent year. |
| 58 | `YEAR` / `MONTH` / `DAY` | 🟢 | ⭐⭐ | `YEAR(<date>)`, etc. | Date expression | Extracts integer components of a date. | For display, create formatted textual columns in date table. |
| 59 | `QUARTER` / `WEEKNUM` | 🟢 | ⭐⭐ | `QUARTER(<date>)`, `WEEKNUM(<date>[, <type>])` | Date expression; optional start day rule | Returns quarter (1–4) or week of year (1–54). | Ensure week numbering convention matches enterprise calendar (ISO vs US). |
| 60 | `WEEKDAY` | ⚪ | ⭐ | `WEEKDAY(<date>[, <return_type>])` | Date; return type (1=Sun-Sat, 2=Mon-Sun) | Returns integer day of week. | Verify return type parameter to align with business working days. |
| 61 | `EDATE` | ⚪ | ⭐⭐⭐ | `EDATE(<start_date>, <months>)` | Date; integer months offset | Shifts date by exact number of months. | Keeps day-of-month where possible; snaps to month end on short months. |
| 62 | `EOMONTH` | ⚪ | ⭐⭐⭐ | `EOMONTH(<start_date>, <months>)` | Date; integer months offset | Returns last day of the month after offset. | `EOMONTH(date, 0)` is the gold standard for month-end normalization. |
| 63 | `TODAY` | ⚪ | ⭐⭐⭐ | `TODAY()` | None | Returns current date at execution. | Volatile function; causes recalculation on model refresh. |
| 64 | `NOW` | ⚪ | ⭐⭐ | `NOW()` | None | Returns current timestamp with time. | Storing high-precision timestamps in fact tables bloats memory. |
| 65 | `FORMAT` | 🟡 | ⭐⭐ | `FORMAT(<value>, <format_string>[, <locale>])` | Scalar value; format code | Converts numbers/dates to formatted text. | Converted output becomes string; cannot be aggregated on axes. |

---

### 2.7 Standard Time Intelligence
> *Prerequisite: An active, contiguous Date dimension marked as "Date Table".*

| # | Function | Status | Priority | Syntax | Parameters | Purpose | Pitfalls / When NOT to Use |
|---:|---|:---:|:---:|---|---|---|---|
| 66 | `DATEADD` | 🟢 | ⭐⭐⭐ | `DATEADD(<dates>, <number>, <interval>)` | Date column; integer; `DAY`/`MONTH`/`QUARTER`/`YEAR` | Shifts dates by specified interval. | Requires contiguous date table with no gaps. |
| 67 | `SAMEPERIODLASTYEAR` | 🟢 | ⭐⭐⭐ | `SAMEPERIODLASTYEAR(<dates>)` | Date column | Shifts selection exactly 1 year back. | Equivalent to `DATEADD(dates, -1, YEAR)`. |
| 68 | `DATESYTD` | ⚪ | ⭐⭐⭐ | `DATESYTD(<dates>[, <year_end_date>])` | Date column; optional fiscal end (e.g. "06-30") | Returns set of dates from year-start to current date. | Preferred over `TOTALYTD` because it cleanly composes inside `CALCULATE`. |
| 69 | `DATESQTD` | ⚪ | ⭐⭐⭐ | `DATESQTD(<dates>)` | Date column | Returns dates from quarter-start to current date. | Clear quarter filter must exist in context. |
| 70 | `DATESMTD` | ⚪ | ⭐⭐⭐ | `DATESMTD(<dates>)` | Date column | Returns dates from month-start to current date. | Resets on the first of every month. |
| 71 | `DATESINPERIOD` | 🟢 | ⭐⭐⭐ | `DATESINPERIOD(<dates>, <start>, <n>, <interval>)` | Date col; anchor date; offset; interval | Computes rolling periods (e.g. Rolling 30 Days, 3 Months). | Pass `MAX(DimDate[Date])` as anchor to roll backwards using negative $n$. |
| 72 | `DATESBETWEEN` | ⚪ | ⭐⭐⭐ | `DATESBETWEEN(<dates>, <start>, <end>)` | Date col; start date; end date | Returns date table between two explicit boundary dates. | Passing `BLANK()` to start date acts as inception-to-date. |
| 73 | `PARALLELPERIOD` | ⚪ | ⭐⭐ | `PARALLELPERIOD(<dates>, <n>, <interval>)` | Date col; offset; `MONTH`/`QUARTER`/`YEAR` | Returns full parallel period irrespective of date slice. | Does not do partial period comparisons (use `DATEADD` instead). |
| 74 | `PREVIOUSMONTH` / `NEXTMONTH` | ⚪ | ⭐⭐⭐ | `PREVIOUSMONTH(<dates>)` | Date column | Shifts to entire prior or next month. | Returns full month dates even if current filter is mid-month. |
| 75 | `PREVIOUSQUARTER` | 🟢 | ⭐⭐⭐ | `PREVIOUSQUARTER(<dates>)` | Date column | Returns all dates in prior quarter. | Same full-grain behavior as `PREVIOUSMONTH`. |
| 76 | `PREVIOUSYEAR` / `NEXTYEAR` | ⚪ | ⭐⭐⭐ | `PREVIOUSYEAR(<dates>[, <year_end>])` | Date column; optional year end date | Returns all dates in prior or next year. | Returns complete 365/366 day set. |
| 77 | `TOTALYTD` | 🟢 | ⭐⭐⭐ | `TOTALYTD(<expr>, <dates>[, <filter>][, <year_end>])` | Expression; dates; optional filter/year end | Syntactic sugar for `CALCULATE(expr, DATESYTD(dates))`. | Harder to troubleshoot when combined with additional filters. |
| 78 | `TOTALQTD` | ⚪ | ⭐⭐ | `TOTALQTD(<expr>, <dates>[, <filter>])` | Expression; dates; optional filter | Syntactic sugar for QTD calculation. | Same composition limits as `TOTALYTD`. |
| 79 | `TOTALMTD` | 🟢 | ⭐⭐⭐ | `TOTALMTD(<expr>, <dates>[, <filter>])` | Expression; dates; optional filter | Syntactic sugar for MTD calculation. | Use `CALCULATE(..., DATESMTD(...))` for complex multi-filter models. |
| 80 | `STARTOFMONTH` / `ENDOFMONTH` | ⚪ | ⭐⭐ | `STARTOFMONTH(<dates>)`, `ENDOFMONTH(<dates>)` | Date column | Returns 1-row date table with start/end date in context. | Returns table, not scalar; use `MIN`/`MAX` if scalar date needed. |
| 81 | `STARTOFQUARTER` / `ENDOFQUARTER` | ⚪ | ⭐⭐ | `STARTOFQUARTER(<dates>)`, etc. | Date column | Returns 1-row date table for quarter boundary. | Table return type. |
| 82 | `STARTOFYEAR` / `ENDOFYEAR` | ⚪ | ⭐⭐ | `STARTOFYEAR(<dates>)`, etc. | Date column | Returns 1-row date table for year boundary. | Table return type. |

---

### 2.8 Modern Window Functions & Visual Calculations
> *Introduced 2022–2025: Native, ultra-high-performance order-based calculations.*

| # | Function | Status | Priority | Syntax | Parameters | Purpose | Pitfalls / When NOT to Use |
|---:|---|:---:|:---:|---|---|---|---|
| 83 | `OFFSET` | ⚪ | ⭐⭐⭐ | `OFFSET(<delta>[, <rel>][, <orderBy>][, <blanks>][, <partitionBy>])` | Integer delta; relation; order; partitions | Compares current row to previous (-1) or next (+1) row. | Replaces slow `EARLIER` or `RANKX` row-comparison patterns. |
| 84 | `INDEX` | ⚪ | ⭐⭐⭐ | `INDEX(<position>[, <rel>][, <orderBy>][, <blanks>][, <partitionBy>])` | Absolute/relative position; relation; ordering | Returns specific row (e.g. 1st row, last row, $N$-th row). | Positive numbers index from top (1); negative from bottom (-1). |
| 85 | `WINDOW` | ⚪ | ⭐⭐⭐ | `WINDOW(<from>, <from_type>, <to>, <to_type>[, <rel>][, <order>])` | Boundary offsets; relative/absolute types; order | Creates moving windows (e.g., 3-month rolling average). | Far faster than complex `DATESINPERIOD` iterators. |
| 86 | `ORDERBY` | ⚪ | ⭐⭐⭐ | `ORDERBY(<col>[, <order>][, ...])` | Column; `ASC`/`DESC` | Helper syntax specifying sorting order for Window functions. | Only usable inside `INDEX`, `OFFSET`, and `WINDOW`. |
| 87 | `PARTITIONBY` | ⚪ | ⭐⭐⭐ | `PARTITIONBY(<col>[, ...])` | Partitioning column list | Groups window calculations independently (like SQL `PARTITION BY`). | Only usable inside Window function definitions. |
| 88 | `MATCHBY` | ⚪ | ⭐⭐ | `MATCHBY(<col>[, ...])` | Key columns | Matches current row when relation doesn't match original table columns. | Advanced window helper; default usually suffices. |
| 89 | `RUNNINGSUM` | ⚪ | ⭐⭐ | `RUNNINGSUM(<column>[, <reset>])` | Visual column; optional reset flag | Power BI **Visual Calculation** running total on canvas. | Visual calculations exist only on the visual, not in semantic model. |
| 90 | `MOVINGAVERAGE` | ⚪ | ⭐⭐ | `MOVINGAVERAGE(<column>, <windowSize>[, <reset>])` | Visual column; integer window size | Power BI **Visual Calculation** moving average. | Visual calculation only. |
| 91 | `COLLAPSE` / `EXPAND` | ⚪ | ⭐⭐ | `COLLAPSE([<level>])`, `EXPAND([<level>])` | Hierarchy axis level | Navigates visual calculation matrix levels dynamically. | Visual calculation only. |

---

### 2.9 Parent-Child Hierarchies
| # | Function | Status | Priority | Syntax | Parameters | Purpose | Pitfalls / When NOT to Use |
|---:|---|:---:|:---:|---|---|---|---|
| 92 | `PATH` | ⚪ | ⭐⭐⭐ | `PATH(<child_key>, <parent_key>)` | Child ID column; Parent ID column | Generates pipe-delimited string (`101\|105\|120`) of hierarchy. | Must be created as a calculated column in the dimension table. |
| 93 | `PATHITEM` | ⚪ | ⭐⭐⭐ | `PATHITEM(<path>, <position>[, <type>])` | Path string; integer level; `TEXT`/`INTEGER` | Extracts entity ID at specific hierarchy depth (Level 1, Level 2). | Position out of bounds returns BLANK. |
| 94 | `PATHCONTAINS` | ⚪ | ⭐⭐ | `PATHCONTAINS(<path>, <item>)` | Path string; search ID | Returns TRUE if item exists anywhere within the lineage path. | Excellent for security access validation in management trees. |
| 95 | `PATHLENGTH` | ⚪ | ⭐ | `PATHLENGTH(<path>)` | Path string | Returns total depth/levels in the hierarchy path. | Use to detect leaf-level records in unbalanced trees. |

---

### 2.10 Calculation Groups & Dynamic Formatting
| # | Function | Status | Priority | Syntax | Parameters | Purpose | Pitfalls / When NOT to Use |
|---:|---|:---:|:---:|---|---|---|---|
| 96 | `SELECTEDMEASURE` | ⚪ | ⭐⭐⭐ | `SELECTEDMEASURE()` | None | References whichever measure is currently being evaluated. | Only valid inside Calculation Items in Calculation Groups. |
| 97 | `SELECTEDMEASURENAME` | ⚪ | ⭐⭐ | `SELECTEDMEASURENAME()` | None | Returns string name of the currently evaluated measure. | Use inside `SWITCH` to apply calculation items conditionally. |
| 98 | `ISSELECTEDMEASURE` | ⚪ | ⭐⭐ | `ISSELECTEDMEASURE(<measure1>[, ...])` | List of measure references | Returns TRUE if current measure is in the whitelist. | Prevents non-additive measures (e.g. Margin %) from invalid operations. |
| 99 | `SELECTEDMEASUREFORMATSTRING` | ⚪ | ⭐⭐ | `SELECTEDMEASUREFORMATSTRING()` | None | Retrieves original format string of the measure. | Use when altering format dynamically in calculation item. |
| 100 | Dynamic Format Strings | ⚪ | ⭐⭐⭐ | Measure Format Property DAX expression | DAX returning formatting string (e.g. `"$#,##0"`) | Dynamic currency conversions, scaling ($K, $M), or units. | Configured per-measure in Model View. |

---

### 2.11 Dynamic Security (RLS) & Metadata
| # | Function | Status | Priority | Syntax | Parameters | Purpose | Pitfalls / When NOT to Use |
|---:|---|:---:|:---:|---|---|---|---|
| 101 | `USERPRINCIPALNAME` | ⚪ | ⭐⭐⭐ | `USERPRINCIPALNAME()` | None | Returns Azure AD / Entra ID login email of the user viewing report. | In Power BI Desktop returns local domain\user; test with "View As". |
| 102 | `USERNAME` | ⚪ | ⭐⭐ | `USERNAME()` | None | Returns user domain identity or email depending on deployment. | Prefer `USERPRINCIPALNAME()` for modern cloud cloud-identity RLS. |
| 103 | `CUSTOMDATA` | ⚪ | ⭐⭐ | `CUSTOMDATA()` | None | Reads connection string parameter passed in Power BI Embedded. | Only applicable in Power BI Embedded or multi-tenant app architectures. |
| 104 | `INFO.TABLES` | ⚪ | ⭐ | `INFO.TABLES()` | None | Returns schema table list via DAX Query View. | Query View / documentation only; cannot be used in visual measures. |
| 105 | `INFO.MEASURES` | ⚪ | ⭐ | `INFO.MEASURES()` | None | Returns all measure names, expressions, and descriptions in model. | Ideal for automated data dictionary generation. |
| 106 | `INFO.RELATIONSHIPS`| ⚪ | ⭐ | `INFO.RELATIONSHIPS()` | None | Returns metadata on all model relationships and cardinalities. | Auditing models for inactive or bi-directional joins. |
| 107 | `VAR` | 🟢 | ⭐⭐⭐ | `VAR <name> = <expr>` | Variable name + expression | Evaluates expression in current context and caches constant scalar/table. | **Variables are immutable constants!** They do not recalculate inside loops. |
| 108 | `RETURN` | 🟢 | ⭐⭐⭐ | `RETURN <expr>` | Final expression | Returns final measure result utilizing declared variables. | Must immediately follow variable declarations. |

---

# 3. Battle-Tested DAX Recipe Library

### Recipe 1: Time Intelligence Matrix (YTD, Prior Year, YoY Growth %)
```DAX
-- 1. Base Measure
Total Sales = SUM(FactSales[SalesAmount])

-- 2. Prior Year Sales (Robust)
Sales PY = 
CALCULATE(
    [Total Sales],
    SAMEPERIODLASTYEAR(DimDate[Date])
)

-- 3. YoY Growth %
YoY Sales Growth % = 
DIVIDE(
    [Total Sales] - [Sales PY],
    [Sales PY]
)
```

### Recipe 2: Safe % of Total (Preventing Slicer Blowouts)
```DAX
Sales % of Selected Total = 
VAR CurrentSales = [Total Sales]
VAR TotalSelectedSales = 
    CALCULATE(
        [Total Sales],
        ALLSELECTED(DimProduct)
    )
RETURN
    DIVIDE(CurrentSales, TotalSelectedSales)
```

### Recipe 3: Modern MoM Growth with `OFFSET` (No Iterators)
```DAX
Sales Prior Month (Offset) = 
CALCULATE(
    [Total Sales],
    OFFSET(
        -1,
        ALLSELECTED(DimDate[YearMonth], DimDate[MonthNumber]),
        ORDERBY(DimDate[MonthNumber], ASC)
    )
)
```

### Recipe 4: Dynamic Top N + "Others" Rollup
```DAX
Top N Sales with Others = 
VAR TopThreshold = [Selected Top N Value] -- from disconnected parameter table
VAR TopEntities = 
    TOPN(
        TopThreshold, 
        ALLSELECTED(DimCustomer[CustomerName]), 
        [Total Sales], 
        DESC
    )
VAR IsInTopN = 
    SELECTEDVALUE(DimCustomer[CustomerName]) IN TopEntities
RETURN
    IF(
        IsInTopN,
        [Total Sales],
        -- If viewing rollup summary in a custom parameter dimension
        CALCULATE([Total Sales], EXCEPT(ALLSELECTED(DimCustomer), TopEntities))
    )
```

### Recipe 5: Dynamic Row-Level Security (RLS)
```DAX
-- Applied on DimSecurity table in Manage Roles
[Email] = USERPRINCIPALNAME()
```

---

# 4. Enterprise Power BI Technical Curriculum

### 4.1 Data Modeling
- 🟢 Star Schema (Fact vs Dimension)
- 🟢 Grain Definition & Primary/Foreign Keys
- 🟢 One-to-Many Relationships & Filter Propagation
- 🟢 Active Relationships & Dedicated Date Dimensions
- ⚪ **Role-Playing Dimensions** (e.g. Order Date vs Ship Date via views or `USERELATIONSHIP`)
- ⚪ **Calculation Groups** (Tabular Editor / Desktop Model View)
- ⚪ **Composite Models** & Storage Modes (Import, DirectQuery, Dual)
- ⚪ **Aggregations** (Pre-aggregated memory cache over DirectQuery fact tables)
- ⚪ **Incremental Refresh & Hybrid Tables** (Archive + Real-time DirectQuery partition)

### 4.2 Power Query & M Engineering
- 🟢 Core Data Types, Row Filtering, Deduplication
- 🟢 Joins: Merge (Inner, Left Outer) & Append
- 🟢 Custom & Conditional Columns
- 🟡 M Basics & Advanced Editor Navigation
- ⚪ **Query Folding** (Ensuring SQL engine offloads heavy transformation)
- ⚪ **Parameters & Dynamic Data Sources**
- ⚪ **Staging Architecture & Dataflows** (Bronze / Silver / Gold ETL pipelines)

### 4.3 Visual Analytics & UI Architecture
- 🟢 Core Visuals: Table, Matrix, Cards, Bar/Column, Trend Lines
- 🟢 Hierarchy Navigation & Drill-Down
- 🟢 Conditional Formatting via DAX Rules
- ⚪ **Field Parameters** (Dynamic metric & dimension switching)
- ⚪ **Bookmarks, Selection Pane & App-like Navigation**
- ⚪ **Drill-Through Pages & Dynamic Tooltip Visuals**
- ⚪ **Visual Calculations** (`RUNNINGSUM`, `MOVINGAVERAGE`, `EXPAND`, `COLLAPSE`)

### 4.4 Engine Optimization & Diagnostics
- ⚪ **VertiPaq Storage Architecture** (Dictionary encoding, Run-Length Encoding, Bit-Packing)
- ⚪ **Cardinality Reduction Strategies** (Splitting DateTime into Date + Time)
- ⚪ **Performance Analyzer** (Visual Display, DAX Query, DirectQuery timings)
- ⚪ **DAX Studio** (Server Timings: Storage Engine vs. Formula Engine SE/FE metrics)
- ⚪ **Tabular Editor 2/3** (BPA - Best Practice Analyzer rules execution)

### 4.5 Enterprise Deployment & Fabric/Service
- ⚪ **Workspaces, Apps & Deployment Pipelines** (Dev → Test → Prod)
- ⚪ **Power BI Developer Mode (`.pbip`) & Git Integration** (Azure DevOps / GitHub PR reviews)
- ⚪ **Scheduled Refresh & Enterprise On-Premises / VNet Gateways**
- ⚪ **Semantic Model Endpoints (XMLA Read/Write)**

---

# 5. Weekly Execution Sprint Plan

```mermaid
flowchart LR
    W1["Week 1: Advanced Context & Modifiers"] --> W2["Week 2: Advanced Virtual Tables"]
    W2 --> W3["Week 3: Modern Window Functions"]
    W3 --> W4["Week 4: Calculation Groups & Parent-Child"]
    W4 --> W5["Week 5: Dynamic RLS & Optimization"]
    W5 --> W6["Week 6: Enterprise Portfolio Capstone"]
```

* **Sprint 1 (Filter Mastery):** Master `CALCULATETABLE`, `ALLSELECTED`, `TREATAS`, `USERELATIONSHIP`, `KEEPFILTERS`.
* **Sprint 2 (Virtual Tables & Analytics):** Master `SUMMARIZECOLUMNS`, Dynamic Top N + Others, Pareto 80/20, Customer Segmentation.
* **Sprint 3 (Window Functions):** Practice `INDEX`, `OFFSET`, `WINDOW`, moving averages, and period-over-period without iterators.
* **Sprint 4 (Enterprise Modeling):** Build Calculation Groups for time-intelligence matrices; model an organizational hierarchy with `PATH` / `PATHITEM`.
* **Sprint 5 (Governance & Engine Tuning):** Implement dynamic RLS with `USERPRINCIPALNAME`; profile queries in DAX Studio (SE vs FE < 20%).
* **Sprint 6 (Portfolio Delivery):** Deploy an end-to-end PBIP semantic model with Git integration, Calculation Groups, and dynamic KPI switches.
