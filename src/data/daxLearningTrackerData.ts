import type { DaxLearningItem, DaxLearningStatus } from '../types';

export type { DaxLearningItem, DaxLearningStatus };

export const DAX_LEARNING_TRACKER_DATA: DaxLearningItem[] = [
  // ==========================================
  // 1. Core calculations and logic
  // ==========================================
  {
    id: "core-sum",
    category: "Core calculations and logic",
    functionName: "SUM",
    status: "Practised",
    syntax: "SUM(<column>)",
    parameter: "column",
    parameterAccepts: "Numeric column reference",
    whatItDoes: "Calculates the arithmetic sum of all numeric values in a column within the current filter context.",
    example: "Total Sales = SUM(FactSales[SalesAmount])"
  },
  {
    id: "core-count",
    category: "Core calculations and logic",
    functionName: "COUNT",
    status: "Practised",
    syntax: "COUNT(<column>)",
    parameter: "column",
    parameterAccepts: "Column of any data type (numeric, text, date)",
    whatItDoes: "Counts the number of non-BLANK values in the specified column.",
    example: "Order Lines Count = COUNT(FactSales[SalesOrderLineKey])"
  },
  {
    id: "core-countrows",
    category: "Core calculations and logic",
    functionName: "COUNTROWS",
    status: "Practised",
    syntax: "COUNTROWS([<table>])",
    parameter: "table",
    parameterAccepts: "Table expression or base table",
    whatItDoes: "Counts the total number of rows in the specified table or filtered table expression under active filter context.",
    example: "Total Transactions = COUNTROWS(FactSales)"
  },
  {
    id: "core-distinctcount",
    category: "Core calculations and logic",
    functionName: "DISTINCTCOUNT",
    status: "Practised",
    syntax: "DISTINCTCOUNT(<column>)",
    parameter: "column",
    parameterAccepts: "Column reference",
    whatItDoes: "Counts the number of unique, non-BLANK values in a column within active filter context.",
    example: "Active Customers = DISTINCTCOUNT(FactSales[CustomerKey])"
  },
  {
    id: "core-divide",
    category: "Core calculations and logic",
    functionName: "DIVIDE",
    status: "Practised",
    syntax: "DIVIDE(<numerator>, <denominator>[, <alternate_result>])",
    parameter: "numerator, denominator, alternate_result",
    parameterAccepts: "Scalar expressions",
    whatItDoes: "Safely performs division and returns alternate_result (or BLANK) on division by zero without raising an error.",
    example: "Profit Margin = DIVIDE([Total Profit], [Total Sales], 0)"
  },
  {
    id: "core-coalesce",
    category: "Core calculations and logic",
    functionName: "COALESCE",
    status: "Practised",
    syntax: "COALESCE(<expr1>, <expr2>[, <expr3>...])",
    parameter: "expression",
    parameterAccepts: "Scalar expressions",
    whatItDoes: "Returns the first non-BLANK expression among its arguments; optimal for fallback defaults.",
    example: "Sales With Fallback = COALESCE([Total Sales], 0)"
  },
  {
    id: "core-if",
    category: "Core calculations and logic",
    functionName: "IF",
    status: "Practised",
    syntax: "IF(<logical_test>, <value_if_true>[, <value_if_false>])",
    parameter: "logical_test, value_if_true, value_if_false",
    parameterAccepts: "Boolean condition, scalar expressions",
    whatItDoes: "Evaluates a condition and returns value_if_true when TRUE, otherwise returns value_if_false.",
    example: "Target Status = IF([Profit Margin] >= 0.25, \"Target Met\", \"Under Target\")"
  },
  {
    id: "core-switch",
    category: "Core calculations and logic",
    functionName: "SWITCH",
    status: "Practised",
    syntax: "SWITCH(<expression>, <value1>, <result1>[, <value2>, <result2>...][, <else>])",
    parameter: "expression, value, result",
    parameterAccepts: "Scalar expression matching exact values",
    whatItDoes: "Evaluates an expression against a list of constant values and returns the matching result.",
    example: "Commission Rate = SWITCH(DimProduct[Category], \"Bikes\", 0.15, \"Accessories\", 0.25, 0.10)"
  },
  {
    id: "core-switch-true",
    category: "Core calculations and logic",
    functionName: "SWITCH(TRUE())",
    status: "Practised",
    syntax: "SWITCH(TRUE(), <condition1>, <result1>[, <condition2>, <result2>...][, <else>])",
    parameter: "conditions, results",
    parameterAccepts: "Boolean expressions evaluated sequentially",
    whatItDoes: "Evaluates multiple independent boolean conditions in order, returning the result for the first TRUE branch.",
    example: "Customer Tier = SWITCH(TRUE(), [Total Sales] > 1000000, \"Enterprise\", [Total Sales] > 250000, \"Mid-Market\", \"SMB\")"
  },
  {
    id: "core-sumx",
    category: "Core calculations and logic",
    functionName: "SUMX",
    status: "Practised",
    syntax: "SUMX(<table>, <expression>)",
    parameter: "table, expression",
    parameterAccepts: "Table to iterate, row-level scalar expression",
    whatItDoes: "Iterates row-by-row over a table in row context, evaluates the scalar expression, and sums the results.",
    example: "Total Revenue = SUMX(FactSales, FactSales[Quantity] * FactSales[UnitPrice])"
  },
  {
    id: "core-averagex",
    category: "Core calculations and logic",
    functionName: "AVERAGEX",
    status: "Practised",
    syntax: "AVERAGEX(<table>, <expression>)",
    parameter: "table, expression",
    parameterAccepts: "Table to iterate, row-level scalar expression",
    whatItDoes: "Calculates the arithmetic average of an expression evaluated for every row of the specified table.",
    example: "Avg Customer Spend = AVERAGEX(VALUES(DimCustomer[CustomerKey]), [Total Sales])"
  },
  {
    id: "core-minx",
    category: "Core calculations and logic",
    functionName: "MINX",
    status: "Practised",
    syntax: "MINX(<table>, <expression>)",
    parameter: "table, expression",
    parameterAccepts: "Table to iterate, row-level scalar expression",
    whatItDoes: "Evaluates an expression for each row of a table and returns the minimum resulting scalar value.",
    example: "Lowest Category Sales = MINX(VALUES(DimProduct[Category]), [Total Sales])"
  },
  {
    id: "core-maxx",
    category: "Core calculations and logic",
    functionName: "MAXX",
    status: "Practised",
    syntax: "MAXX(<table>, <expression>)",
    parameter: "table, expression",
    parameterAccepts: "Table to iterate, row-level scalar expression",
    whatItDoes: "Evaluates an expression for each row of a table and returns the maximum resulting scalar value.",
    example: "Peak Monthly Sales = MAXX(VALUES(DimDate[MonthYear]), [Total Sales])"
  },
  {
    id: "core-var-return",
    category: "Core calculations and logic",
    functionName: "VAR / RETURN",
    status: "Practised",
    syntax: "VAR <Name> = <Expression> RETURN <Result>",
    parameter: "Name, Expression",
    parameterAccepts: "Scalar, measure, or table expression",
    whatItDoes: "Stores the result of an expression as a named variable evaluated once in local context for performance and readability.",
    example: "Net Margin = VAR Rev = [Total Sales] VAR Cost = [Total Cost] RETURN Rev - Cost"
  },
  {
    id: "core-format",
    category: "Core calculations and logic",
    functionName: "FORMAT",
    status: "Introduced",
    syntax: "FORMAT(<value>, <format_string>)",
    parameter: "value, format_string",
    parameterAccepts: "Scalar value, standard or custom format string",
    whatItDoes: "Converts a value to text according to specified format string (returns string data type, which cannot be summed directly).",
    example: "Formatted Sales = FORMAT([Total Sales], \"$#,##0.00\")"
  },

  // ==========================================
  // 2. Filter context and evaluation
  // ==========================================
  {
    id: "filter-calculate",
    category: "Filter context and evaluation",
    functionName: "CALCULATE",
    status: "Practised",
    syntax: "CALCULATE(<expression>[, <filter1>[, <filter2>...]])",
    parameter: "expression, filter arguments",
    parameterAccepts: "Scalar expression/measure, filter predicates or modifiers",
    whatItDoes: "The powerhouse of DAX: modifies filter context, executes context transition, and evaluates expressions under new context.",
    example: "Bikes Sales = CALCULATE([Total Sales], DimProduct[Category] = \"Bikes\")"
  },
  {
    id: "filter-filter",
    category: "Filter context and evaluation",
    functionName: "FILTER",
    status: "Practised",
    syntax: "FILTER(<table>, <filter_expression>)",
    parameter: "table, filter_expression",
    parameterAccepts: "Table expression, row-level boolean condition",
    whatItDoes: "Iterates over a table row-by-row and returns a virtual table containing only rows where condition evaluates to TRUE.",
    example: "High Value Sales = CALCULATE([Total Sales], FILTER(FactSales, FactSales[SalesAmount] > 1000))"
  },
  {
    id: "filter-all",
    category: "Filter context and evaluation",
    functionName: "ALL",
    status: "Practised",
    syntax: "ALL([<table> | <column>[, <column>...]])",
    parameter: "table or columns",
    parameterAccepts: "Base table or column reference",
    whatItDoes: "Removes all filters from specified tables or columns, returning all distinct values or the entire unconstrained table.",
    example: "% of All Sales = DIVIDE([Total Sales], CALCULATE([Total Sales], ALL(FactSales)))"
  },
  {
    id: "filter-removefilters",
    category: "Filter context and evaluation",
    functionName: "REMOVEFILTERS",
    status: "Practised",
    syntax: "REMOVEFILTERS([<table> | <column>[, <column>...]])",
    parameter: "table or columns",
    parameterAccepts: "Table or column reference",
    whatItDoes: "Dedicated CALCULATE filter modifier that strips filters from specified tables/columns without returning an in-memory table.",
    example: "Clear Product Filters = CALCULATE([Total Sales], REMOVEFILTERS(DimProduct[Category]))"
  },
  {
    id: "filter-allexcept",
    category: "Filter context and evaluation",
    functionName: "ALLEXCEPT",
    status: "Practised",
    syntax: "ALLEXCEPT(<table>, <column>[, <column>...])",
    parameter: "table, preserve_columns",
    parameterAccepts: "Base table, columns whose filters are retained",
    whatItDoes: "Removes all filters on a table except filters on the specified columns.",
    example: "Category Baseline = CALCULATE([Total Sales], ALLEXCEPT(DimProduct, DimProduct[Category]))"
  },
  {
    id: "filter-keepfilters",
    category: "Filter context and evaluation",
    functionName: "KEEPFILTERS",
    status: "Practised",
    syntax: "KEEPFILTERS(<expression>)",
    parameter: "filter_expression",
    parameterAccepts: "Filter expression inside CALCULATE",
    whatItDoes: "Overrides CALCULATE's default filter replacement behavior, enforcing filter intersection (AND logic) with existing filters.",
    example: "Red Accessories = CALCULATE([Total Sales], KEEPFILTERS(DimProduct[Color] = \"Red\"))"
  },
  {
    id: "filter-allselected",
    category: "Filter context and evaluation",
    functionName: "ALLSELECTED",
    status: "Practised",
    syntax: "ALLSELECTED([<table> | <column>])",
    parameter: "table or column",
    parameterAccepts: "Table or column reference",
    whatItDoes: "Removes inner visual grouping context while respecting outer slicers and report filters, essential for visual subtotal shares.",
    example: "% of Visual Total = DIVIDE([Total Sales], CALCULATE([Total Sales], ALLSELECTED()))"
  },
  {
    id: "filter-calculatetable",
    category: "Filter context and evaluation",
    functionName: "CALCULATETABLE",
    status: "Practised",
    syntax: "CALCULATETABLE(<table>[, <filter1>...])",
    parameter: "table, filters",
    parameterAccepts: "Table expression, filter predicates",
    whatItDoes: "Evaluates a table expression under modified filter context and returns a virtual table.",
    example: "Active Customers Table = CALCULATETABLE(VALUES(DimCustomer[CustomerKey]), FactSales[SalesAmount] > 0)"
  },
  {
    id: "concept-row-context",
    category: "Filter context and evaluation",
    functionName: "Row context",
    status: "Practised",
    syntax: "Row Context (Iterators & Calculated Columns)",
    parameter: "Current row scan",
    parameterAccepts: "Active row in table iteration",
    whatItDoes: "DAX Concept: Knows the column values of the current row being processed, but does NOT filter other tables or measures on its own.",
    example: "FactSales[Quantity] * FactSales[UnitPrice] -- Evaluated row-by-row in row context"
  },
  {
    id: "concept-filter-context",
    category: "Filter context and evaluation",
    functionName: "Filter context",
    status: "Practised",
    syntax: "Filter Context (Coordinates from visual, slicers & CALCULATE)",
    parameter: "Set of active filters",
    parameterAccepts: "Visual rows, columns, slicers, and filter pane",
    whatItDoes: "DAX Concept: The boundary of active filters applied across the entire tabular data model that determines visible rows in facts.",
    example: "[Total Sales] placed in Matrix rows (Year) and columns (Category)"
  },
  {
    id: "concept-context-transition",
    category: "Filter context and evaluation",
    functionName: "Context transition",
    status: "Practised",
    syntax: "CALCULATE(<measure>) inside Row Context",
    parameter: "Row context to filter context transform",
    parameterAccepts: "Active row converted via CALCULATE",
    whatItDoes: "DAX Concept: Transforming the current row context into an equivalent filter context, filtering the model by all columns of the active row.",
    example: "ADDCOLUMNS(DimCustomer, \"CustomerRevenue\", [Total Sales])"
  },
  {
    id: "concept-filter-replacement-vs-intersection",
    category: "Filter context and evaluation",
    functionName: "Filter replacement vs. intersection",
    status: "Practised",
    syntax: "CALCULATE Overwrite vs KEEPFILTERS Intersection",
    parameter: "Filter resolution semantics",
    parameterAccepts: "Predicate overwrite vs AND combination",
    whatItDoes: "DAX Concept: CALCULATE replaces existing filters on the same column by default, while KEEPFILTERS intersects with existing filters.",
    example: "CALCULATE([Total Sales], KEEPFILTERS(DimDate[Year] = 2024))"
  },
  {
    id: "concept-relationship-filter-propagation",
    category: "Filter context and evaluation",
    functionName: "Relationship filter propagation",
    status: "Practised",
    syntax: "Physical 1-to-Many Propagation",
    parameter: "Primary key to foreign key flow",
    parameterAccepts: "Active physical model relationship",
    whatItDoes: "DAX Concept: Filters automatically cascade downhill from the 1-side (dimension) to the *-side (fact table) along active relationships.",
    example: "Selecting DimGeography[Country] = \"US\" automatically filters FactSales rows"
  },
  {
    id: "filter-hasonevalue",
    category: "Filter context and evaluation",
    functionName: "HASONEVALUE",
    status: "Practised",
    syntax: "HASONEVALUE(<column>)",
    parameter: "column",
    parameterAccepts: "Column reference",
    whatItDoes: "Returns TRUE when the specified column has been filtered down to exactly one distinct value in active filter context.",
    example: "Single Category Check = IF(HASONEVALUE(DimProduct[Category]), [Total Sales], BLANK())"
  },
  {
    id: "filter-selectedvalue",
    category: "Filter context and evaluation",
    functionName: "SELECTEDVALUE",
    status: "Practised",
    syntax: "SELECTEDVALUE(<column>[, <alternate_result>])",
    parameter: "column, alternate_result",
    parameterAccepts: "Column reference, optional fallback scalar",
    whatItDoes: "Returns the value when there is exactly one distinct value visible in the column; otherwise returns alternate_result or BLANK.",
    example: "Header Title = SELECTEDVALUE(DimDate[Year], \"All Years\")"
  },
  {
    id: "filter-isinscope",
    category: "Filter context and evaluation",
    functionName: "ISINSCOPE",
    status: "Practised",
    syntax: "ISINSCOPE(<column>)",
    parameter: "column",
    parameterAccepts: "Column in matrix row/column hierarchy",
    whatItDoes: "Returns TRUE when the specified column is the active grouping level in a visual hierarchy; essential for dynamic subtotal calculations.",
    example: "Subtotal Logic = IF(ISINSCOPE(DimProduct[Subcategory]), [Subtotal Rank], [Category Rank])"
  },
  {
    id: "filter-iscrossfiltered",
    category: "Filter context and evaluation",
    functionName: "ISCROSSFILTERED",
    status: "Introduced",
    syntax: "ISCROSSFILTERED(<table> | <column>)",
    parameter: "table or column",
    parameterAccepts: "Table or column reference",
    whatItDoes: "Returns TRUE if the specified table or column is currently being filtered directly or indirectly via relationship propagation.",
    example: "Is Filtered = IF(ISCROSSFILTERED(DimCustomer), \"Customer Filter Active\", \"Showing All\")"
  },

  // ==========================================
  // 3. Table expressions and virtual tables
  // ==========================================
  {
    id: "table-values",
    category: "Table expressions and virtual tables",
    functionName: "VALUES",
    status: "Practised",
    syntax: "VALUES(<table_or_column>)",
    parameter: "table or column",
    parameterAccepts: "Column reference or table name",
    whatItDoes: "Returns a single-column table of distinct values visible in current filter context, preserving the blank row for referential mismatches.",
    example: "Distinct Categories = VALUES(DimProduct[Category])"
  },
  {
    id: "table-distinct",
    category: "Table expressions and virtual tables",
    functionName: "DISTINCT",
    status: "Practised",
    syntax: "DISTINCT(<table> | <column>)",
    parameter: "table or column",
    parameterAccepts: "Column or table expression",
    whatItDoes: "Returns a table of unique rows or values in active context, strictly excluding the blank row generated by relationship violations.",
    example: "Unique Categories = DISTINCT(DimProduct[Category])"
  },
  {
    id: "table-addcolumns",
    category: "Table expressions and virtual tables",
    functionName: "ADDCOLUMNS",
    status: "Practised",
    syntax: "ADDCOLUMNS(<table>, <name>, <expression>[, <name2>, <expression2>...])",
    parameter: "table, name, expression",
    parameterAccepts: "Table expression, column name string, row-level expression",
    whatItDoes: "Adds calculated columns to a virtual table expression, evaluating the expression per row in a row context.",
    example: "Customer Sales Table = ADDCOLUMNS(VALUES(DimCustomer[CustomerKey]), \"Revenue\", [Total Sales])"
  },
  {
    id: "table-selectcolumns",
    category: "Table expressions and virtual tables",
    functionName: "SELECTCOLUMNS",
    status: "Practised",
    syntax: "SELECTCOLUMNS(<table>, <name>, <expression>[, ...])",
    parameter: "table, name, expression",
    parameterAccepts: "Table expression, column aliases, row-level expressions",
    whatItDoes: "Returns a virtual table with selected, computed, or renamed columns, evaluated in row context over the input table.",
    example: "Orders Summary = SELECTCOLUMNS(FactSales, \"Order ID\", FactSales[OrderNumber], \"Amount\", FactSales[SalesAmount])"
  },
  {
    id: "table-summarize",
    category: "Table expressions and virtual tables",
    functionName: "SUMMARIZE",
    status: "Practised",
    syntax: "SUMMARIZE(<table>, <groupBy_column>[, <groupBy_column>...])",
    parameter: "table, groupBy_columns",
    parameterAccepts: "Base table, grouping dimension columns",
    whatItDoes: "Produces a distinct virtual summary table grouped by the specified columns (best practice: use for grouping only, not aggregations).",
    example: "Product Groupings = SUMMARIZE(FactSales, DimProduct[Category], DimDate[CalendarYear])"
  },
  {
    id: "table-summarizecolumns",
    category: "Table expressions and virtual tables",
    functionName: "SUMMARIZECOLUMNS",
    status: "Practised",
    syntax: "SUMMARIZECOLUMNS(<groupBy_column>[, ...][, <filterTable>]..., <name>, <expression>...)",
    parameter: "groupBy_columns, filterTables, measures",
    parameterAccepts: "Grouping columns, filter tables, measure expressions",
    whatItDoes: "High-performance query engine function for computing summary tables with context transition and filter parameters.",
    example: "Yearly Matrix = SUMMARIZECOLUMNS(DimDate[CalendarYear], \"Total Sales\", [Total Sales])"
  },
  {
    id: "table-topn",
    category: "Table expressions and virtual tables",
    functionName: "TOPN",
    status: "Practised",
    syntax: "TOPN(<n_value>, <table>, <orderBy_expression>[, <order>])",
    parameter: "n_value, table, orderBy_expression, order",
    parameterAccepts: "Integer count, table expression, sorting metric, ASC/DESC",
    whatItDoes: "Returns the top N rows of the specified table sorted by the orderBy_expression.",
    example: "Top 5 Products Table = TOPN(5, VALUES(DimProduct[ProductName]), [Total Sales], DESC)"
  },
  {
    id: "table-rankx",
    category: "Table expressions and virtual tables",
    functionName: "RANKX",
    status: "Practised",
    syntax: "RANKX(<table>, <expression>[, <value>][, <order>][, <ties>])",
    parameter: "table, expression, value, order, ties",
    parameterAccepts: "Table of peers, evaluation metric, ASC/DESC, Skip/Dense",
    whatItDoes: "Calculates the dynamic numerical rank of the current row/item against the specified table of peers.",
    example: "Product Rank = RANKX(ALLSELECTED(DimProduct[ProductName]), [Total Sales], , DESC, Dense)"
  },
  {
    id: "table-generate",
    category: "Table expressions and virtual tables",
    functionName: "GENERATE",
    status: "Practised",
    syntax: "GENERATE(<table1>, <table2>)",
    parameter: "table1, table2",
    parameterAccepts: "Outer table, correlated inner table expression",
    whatItDoes: "Evaluates the second table expression for each row of the first table, returning a cross-join of correlated row combinations.",
    example: "Top Product Per Year = GENERATE(VALUES(DimDate[CalendarYear]), TOPN(1, VALUES(DimProduct[Category]), [Total Sales], DESC))"
  },
  {
    id: "concept-virtual-table-grain",
    category: "Table expressions and virtual tables",
    functionName: "Virtual-table grain",
    status: "Practised",
    syntax: "Virtual Table Lineage & Grouping Grain",
    parameter: "Grain of materialized virtual rows",
    parameterAccepts: "Column uniqueness & lineage keys",
    whatItDoes: "DAX Concept: Managing the exact granularity of in-memory tables produced by SUMMARIZE / ADDCOLUMNS to prevent duplicated or missing rows.",
    example: "Ensuring virtual table has unique CustomerKey grain before computing customer averages"
  },
  {
    id: "concept-filtering-virtual-tables",
    category: "Table expressions and virtual tables",
    functionName: "Filtering virtual tables",
    status: "Practised",
    syntax: "FILTER(<virtual_table>, <condition>)",
    parameter: "Virtual table row filter",
    parameterAccepts: "In-memory table expression, scalar boolean condition",
    whatItDoes: "DAX Concept: Applying FILTER or CALCULATETABLE to in-memory virtual tables before aggregating them with iterator functions.",
    example: "FILTER(ADDCOLUMNS(VALUES(DimProduct[Category]), \"CatSales\", [Total Sales]), [CatSales] > 50000)"
  },
  {
    id: "concept-iterating-over-virtual-tables",
    category: "Table expressions and virtual tables",
    functionName: "Iterating over virtual tables",
    status: "Practised",
    syntax: "SUMX / AVERAGEX(<virtual_table>, <expression>)",
    parameter: "Iterator over virtual records",
    parameterAccepts: "Virtual table, measure or virtual column reference",
    whatItDoes: "DAX Concept: Iterating over intermediate multi-row virtual tables to compute 2nd-stage metrics like monthly averages or distribution medians.",
    example: "AVERAGEX(ADDCOLUMNS(VALUES(DimDate[Date]), \"DailySales\", [Total Sales]), [DailySales])"
  },

  // ==========================================
  // 4. Relationships and filter transfer
  // ==========================================
  {
    id: "rel-related",
    category: "Relationships and filter transfer",
    functionName: "RELATED",
    status: "Practised",
    syntax: "RELATED(<column>)",
    parameter: "column",
    parameterAccepts: "Column from 1-side of active physical relationship",
    whatItDoes: "Fetches a scalar value from the related 1-side table following an active physical relationship in row context.",
    example: "Total Cost Line = FactSales[Quantity] * RELATED(DimProduct[UnitCost])"
  },
  {
    id: "rel-relatedtable",
    category: "Relationships and filter transfer",
    functionName: "RELATEDTABLE",
    status: "Practised",
    syntax: "RELATEDTABLE(<table>)",
    parameter: "table",
    parameterAccepts: "Table on *-side of relationship",
    whatItDoes: "Evaluates a table expression in the row context of the current row, returning all corresponding matching rows from the *-side fact table.",
    example: "Customer Order Count = COUNTROWS(RELATEDTABLE(FactSales))"
  },
  {
    id: "rel-userelationship",
    category: "Relationships and filter transfer",
    functionName: "USERELATIONSHIP",
    status: "Practised",
    syntax: "USERELATIONSHIP(<column1>, <column2>)",
    parameter: "column1, column2",
    parameterAccepts: "Physical model columns in inactive relationship",
    whatItDoes: "Activates an inactive physical relationship between two columns for the duration of the CALCULATE calculation.",
    example: "Sales by Ship Date = CALCULATE([Total Sales], USERELATIONSHIP(FactSales[ShipDateKey], DimDate[DateKey]))"
  },
  {
    id: "rel-treatas-single",
    category: "Relationships and filter transfer",
    functionName: "TREATAS — single column",
    status: "Practised",
    syntax: "TREATAS(<table>, <column>)",
    parameter: "table, target_column",
    parameterAccepts: "Virtual table or VALUES, physical model column",
    whatItDoes: "Applies the result of a table expression as filters onto an unrelated model column without creating a physical relationship.",
    example: "Target Filtered Sales = CALCULATE([Total Sales], TREATAS(VALUES(Targets[Category]), DimProduct[Category]))"
  },
  {
    id: "rel-treatas-multi",
    category: "Relationships and filter transfer",
    functionName: "TREATAS — multiple columns and exact pairs",
    status: "Practised",
    syntax: "TREATAS(<table>, <column1>, <column2>...)",
    parameter: "table, target_columns",
    parameterAccepts: "Multi-column virtual table, matching model columns",
    whatItDoes: "Applies multi-column tuples as combined filter context onto multiple unrelated model columns as exact correlated pairs.",
    example: "Budget Comparison = CALCULATE([Total Sales], TREATAS(SUMMARIZE(Budgets, Budgets[Year], Budgets[Country]), DimDate[CalendarYear], DimGeography[Country]))"
  },
  {
    id: "concept-active-vs-inactive-rel",
    category: "Relationships and filter transfer",
    functionName: "Active vs. inactive relationships",
    status: "Practised",
    syntax: "Active (Default) vs USERELATIONSHIP (Inactive)",
    parameter: "Role-playing relationship paths",
    parameterAccepts: "Multiple relationship linkages between tables",
    whatItDoes: "DAX Concept: Managing role-playing dimensions (Order Date vs Ship Date vs Due Date) with one active link and multiple inactive links.",
    example: "Order Sales = [Total Sales]; Ship Sales = CALCULATE([Total Sales], USERELATIONSHIP(FactSales[ShipDate], DimDate[Date]))"
  },
  {
    id: "concept-one-to-many-behaviour",
    category: "Relationships and filter transfer",
    functionName: "One-to-many relationship behaviour",
    status: "Practised",
    syntax: "1:* Single Direction Filter Propagation",
    parameter: "Filter direction and cardinality",
    parameterAccepts: "Primary Key to Foreign Key linkages",
    whatItDoes: "DAX Concept: Filters naturally propagate from the 1-side dimension to *-side facts; facts do not filter dimensions without bidirectional cross-filter.",
    example: "DimCustomer filters FactSales automatically, but filtering FactSales does not filter DimCustomer"
  },
  {
    id: "concept-context-transition-in-iterators",
    category: "Relationships and filter transfer",
    functionName: "Context transition inside iterators",
    status: "Practised",
    syntax: "SUMX(<table>, CALCULATE(<expression>))",
    parameter: "Row context transition during iteration",
    parameterAccepts: "Table iteration and explicit measure call",
    whatItDoes: "DAX Concept: Calling a measure inside an iterator triggers internal CALCULATE, converting current iteration row into filter context.",
    example: "SUMX(VALUES(DimProduct[ProductID]), [Total Sales])"
  },

  // ==========================================
  // 5. Dates and time intelligence
  // ==========================================
  {
    id: "date-calendar",
    category: "Dates and time intelligence",
    functionName: "CALENDAR",
    status: "Practised",
    syntax: "CALENDAR(<start_date>, <end_date>)",
    parameter: "start_date, end_date",
    parameterAccepts: "Date expressions",
    whatItDoes: "Generates a single-column table of contiguous calendar dates between start_date and end_date.",
    example: "DateTable = CALENDAR(DATE(2022, 1, 1), DATE(2026, 12, 31))"
  },
  {
    id: "date-date",
    category: "Dates and time intelligence",
    functionName: "DATE",
    status: "Practised",
    syntax: "DATE(<year>, <month>, <day>)",
    parameter: "year, month, day",
    parameterAccepts: "Integers representing year, month, day",
    whatItDoes: "Constructs a valid DateTime value from separate year, month, and day integers.",
    example: "Cutoff Date = DATE(2024, 12, 31)"
  },
  {
    id: "date-year",
    category: "Dates and time intelligence",
    functionName: "YEAR",
    status: "Practised",
    syntax: "YEAR(<date>)",
    parameter: "date",
    parameterAccepts: "Date or DateTime column/expression",
    whatItDoes: "Extracts the four-digit year (e.g. 2024) from a given date.",
    example: "Year Number = YEAR(DimDate[Date])"
  },
  {
    id: "date-month",
    category: "Dates and time intelligence",
    functionName: "MONTH",
    status: "Practised",
    syntax: "MONTH(<date>)",
    parameter: "date",
    parameterAccepts: "Date or DateTime column/expression",
    whatItDoes: "Extracts the month number (1 to 12) from a given date.",
    example: "Month Number = MONTH(DimDate[Date])"
  },
  {
    id: "date-quarter",
    category: "Dates and time intelligence",
    functionName: "QUARTER",
    status: "Practised",
    syntax: "QUARTER(<date>)",
    parameter: "date",
    parameterAccepts: "Date or DateTime column/expression",
    whatItDoes: "Extracts the calendar quarter number (1 to 4) from a given date.",
    example: "Quarter Number = QUARTER(DimDate[Date])"
  },
  {
    id: "date-eomonth",
    category: "Dates and time intelligence",
    functionName: "EOMONTH",
    status: "Practised",
    syntax: "EOMONTH(<start_date>, <months>)",
    parameter: "start_date, months",
    parameterAccepts: "Date, integer month offset",
    whatItDoes: "Returns the date corresponding to the last day of the month, n months before or after start_date.",
    example: "Month End Date = EOMONTH(DimDate[Date], 0)"
  },
  {
    id: "date-dateadd",
    category: "Dates and time intelligence",
    functionName: "DATEADD",
    status: "Practised",
    syntax: "DATEADD(<dates>, <number_of_intervals>, <interval>)",
    parameter: "dates, number_of_intervals, interval",
    parameterAccepts: "Date column, integer shift, YEAR/QUARTER/MONTH/DAY",
    whatItDoes: "Shifts the current date filter context by a specified number of intervals backward or forward in time.",
    example: "Prior Month Sales = CALCULATE([Total Sales], DATEADD(DimDate[Date], -1, MONTH))"
  },
  {
    id: "date-previousmonth",
    category: "Dates and time intelligence",
    functionName: "PREVIOUSMONTH",
    status: "Practised",
    syntax: "PREVIOUSMONTH(<dates>)",
    parameter: "dates",
    parameterAccepts: "Date column",
    whatItDoes: "Returns all dates from the entire previous calendar month based on the first date in the current filter context.",
    example: "Previous Month Sales = CALCULATE([Total Sales], PREVIOUSMONTH(DimDate[Date]))"
  },
  {
    id: "date-previousquarter",
    category: "Dates and time intelligence",
    functionName: "PREVIOUSQUARTER",
    status: "Practised",
    syntax: "PREVIOUSQUARTER(<dates>)",
    parameter: "dates",
    parameterAccepts: "Date column",
    whatItDoes: "Returns all dates from the entire previous calendar quarter based on the first date in the current filter context.",
    example: "Previous Quarter Sales = CALCULATE([Total Sales], PREVIOUSQUARTER(DimDate[Date]))"
  },
  {
    id: "date-sameperiodlastyear",
    category: "Dates and time intelligence",
    functionName: "SAMEPERIODLASTYEAR",
    status: "Practised",
    syntax: "SAMEPERIODLASTYEAR(<dates>)",
    parameter: "dates",
    parameterAccepts: "Date column",
    whatItDoes: "Returns the exact set of dates shifted one full year back in time from the current filter context.",
    example: "Sales SPLY = CALCULATE([Total Sales], SAMEPERIODLASTYEAR(DimDate[Date]))"
  },
  {
    id: "date-totalytd",
    category: "Dates and time intelligence",
    functionName: "TOTALYTD",
    status: "Practised",
    syntax: "TOTALYTD(<expression>, <dates>[, <filter>][, <year_end_date>])",
    parameter: "expression, dates, filter",
    parameterAccepts: "Scalar measure, date column",
    whatItDoes: "Evaluates an expression for the year-to-date period in the current date filter context.",
    example: "Sales YTD = TOTALYTD([Total Sales], DimDate[Date])"
  },
  {
    id: "date-totalmtd",
    category: "Dates and time intelligence",
    functionName: "TOTALMTD",
    status: "Practised",
    syntax: "TOTALMTD(<expression>, <dates>[, <filter>])",
    parameter: "expression, dates, filter",
    parameterAccepts: "Scalar measure, date column",
    whatItDoes: "Evaluates an expression for the month-to-date period in the current date filter context.",
    example: "Sales MTD = TOTALMTD([Total Sales], DimDate[Date])"
  },
  {
    id: "date-datesinperiod",
    category: "Dates and time intelligence",
    functionName: "DATESINPERIOD",
    status: "Practised",
    syntax: "DATESINPERIOD(<dates>, <start_date>, <number_of_intervals>, <interval>)",
    parameter: "dates, start_date, number_of_intervals, interval",
    parameterAccepts: "Date column, anchor date scalar, integer, DAY/MONTH/QUARTER/YEAR",
    whatItDoes: "Returns a table of dates starting from start_date and spanning the specified interval count; ideal for rolling periods.",
    example: "Rolling 90 Days = CALCULATE([Total Sales], DATESINPERIOD(DimDate[Date], MAX(DimDate[Date]), -90, DAY))"
  },
  {
    id: "concept-date-table-creation-and-use",
    category: "Dates and time intelligence",
    functionName: "Date-table creation and use",
    status: "Practised",
    syntax: "Mark as Date Table Architecture",
    parameter: "Contiguous calendar dimension",
    parameterAccepts: "Continuous unique date column with no gaps",
    whatItDoes: "DAX Concept: Designing a dedicated date dimension table with continuous dates, no missing days, marked as Date Table in Power BI.",
    example: "DimDate = ADDCOLUMNS(CALENDAR(DATE(2022,1,1), DATE(2026,12,31)), \"Year\", YEAR([Date]), \"Month\", FORMAT([Date], \"mmm yyyy\"))"
  },
  {
    id: "pattern-mom-change-and-growth",
    category: "Dates and time intelligence",
    functionName: "Month-over-month (MoM) change and growth",
    status: "Practised",
    syntax: "[Sales] - [Sales PM] and DIVIDE([Sales Diff], [Sales PM])",
    parameter: "Monthly comparative variance",
    parameterAccepts: "Current month and previous month measures",
    whatItDoes: "DAX Pattern: Calculating monthly absolute variance in currency and percentage growth rate.",
    example: "VAR Prev = CALCULATE([Total Sales], DATEADD(DimDate[Date], -1, MONTH)) RETURN DIVIDE([Total Sales] - Prev, Prev)"
  },
  {
    id: "pattern-qoq-change-and-growth",
    category: "Dates and time intelligence",
    functionName: "Quarter-over-quarter (QoQ) change and growth",
    status: "Practised",
    syntax: "[Sales] - [Sales PQ] and DIVIDE([Sales Diff], [Sales PQ])",
    parameter: "Quarterly comparative variance",
    parameterAccepts: "Current quarter and previous quarter measures",
    whatItDoes: "DAX Pattern: Calculating quarterly variance and sequential quarter-on-quarter growth percentage.",
    example: "VAR PrevQ = CALCULATE([Total Sales], DATEADD(DimDate[Date], -1, QUARTER)) RETURN DIVIDE([Total Sales] - PrevQ, PrevQ)"
  },
  {
    id: "pattern-yoy-change-and-growth",
    category: "Dates and time intelligence",
    functionName: "Year-over-year (YoY) change and growth",
    status: "Practised",
    syntax: "[Sales] - [Sales SPLY] and DIVIDE([Sales Diff], [Sales SPLY])",
    parameter: "Annual comparative variance",
    parameterAccepts: "Current year and prior year measures",
    whatItDoes: "DAX Pattern: Calculating annual variance and YoY growth % across identical historical calendar periods.",
    example: "VAR PriorYear = CALCULATE([Total Sales], SAMEPERIODLASTYEAR(DimDate[Date])) RETURN DIVIDE([Total Sales] - PriorYear, PriorYear)"
  },
  {
    id: "pattern-rolling-three-month-averages",
    category: "Dates and time intelligence",
    functionName: "Rolling three-month averages",
    status: "Practised",
    syntax: "DATESINPERIOD(<dates>, MAX(<dates>), -3, MONTH)",
    parameter: "Moving 3-month window",
    parameterAccepts: "Date column & window boundaries",
    whatItDoes: "DAX Pattern: Computes a rolling 3-month moving average of sales to smooth out seasonality.",
    example: "Rolling 3M Avg = DIVIDE(CALCULATE([Total Sales], DATESINPERIOD(DimDate[Date], MAX(DimDate[Date]), -3, MONTH)), 3)"
  },
  {
    id: "pattern-previous-three-month-trend",
    category: "Dates and time intelligence",
    functionName: "Previous-three-month trend comparison",
    status: "Practised",
    syntax: "Current 3M vs Prior Non-Overlapping 3M",
    parameter: "Consecutive rolling blocks",
    parameterAccepts: "Offset date intervals",
    whatItDoes: "DAX Pattern: Evaluates 3-month rolling performance compared directly against the preceding 3-month period.",
    example: "VAR Cur3M = CALCULATE([Total Sales], DATESINPERIOD(DimDate[Date], MAX(DimDate[Date]), -3, MONTH)) VAR Prior3M = CALCULATE([Total Sales], DATESINPERIOD(DimDate[Date], EDATE(MAX(DimDate[Date]), -3), -3, MONTH)) RETURN Cur3M - Prior3M"
  },
  {
    id: "pattern-same-quarter-multi-year",
    category: "Dates and time intelligence",
    functionName: "Same-quarter, multi-year comparison",
    status: "Practised",
    syntax: "CALCULATE([Sales], DimDate[Quarter] = SELECTEDVALUE(DimDate[Quarter]), ALL(DimDate[Year]))",
    parameter: "Quarter filter across all years",
    parameterAccepts: "Quarter attribute and unconstrained year filter",
    whatItDoes: "DAX Pattern: Compares performance of Q1 across multiple consecutive years simultaneously.",
    example: "Q1 Multi-Year = CALCULATE([Total Sales], ALL(DimDate[CalendarYear]), VALUES(DimDate[CalendarQuarter]))"
  },
  {
    id: "concept-date-filter-missing-periods",
    category: "Dates and time intelligence",
    functionName: "Date-filter context and missing periods",
    status: "Practised",
    syntax: "Handling Non-Contiguous Dates & Blank Periods",
    parameter: "Fact gap suppression",
    parameterAccepts: "Boundary check against Fact order dates",
    whatItDoes: "DAX Concept: Overcoming gaps when fact records don't exist for weekends/holidays while preserving date continuity.",
    example: "IF(MIN(DimDate[Date]) <= MAX(FactSales[OrderDate]), [Total Sales], BLANK())"
  },

  // ==========================================
  // 6. Modern window functions
  // ==========================================
  {
    id: "win-index",
    category: "Modern window functions",
    functionName: "INDEX",
    status: "Practised",
    syntax: "INDEX(<position>[, <relation>][, <orderBy>][, <blanks>][, <partitionBy>])",
    parameter: "position, relation, orderBy, partitionBy",
    parameterAccepts: "Absolute integer (1 = first, -1 = last), table expression",
    whatItDoes: "Returns a row at an absolute position within a partitioned and ordered window of rows.",
    example: "Top Product = CALCULATE([Total Sales], INDEX(1, ALLSELECTED(DimProduct[ProductName]), ORDERBY([Total Sales], DESC)))"
  },
  {
    id: "win-offset",
    category: "Modern window functions",
    functionName: "OFFSET",
    status: "Practised",
    syntax: "OFFSET(<delta>[, <relation>][, <orderBy>][, <blanks>][, <partitionBy>])",
    parameter: "delta, relation, orderBy, partitionBy",
    parameterAccepts: "Relative integer shift (-1 = previous row, +1 = next row)",
    whatItDoes: "Returns a row at a relative offset position from the current row within the specified partition and order.",
    example: "Prior Month Offset = CALCULATE([Total Sales], OFFSET(-1, ALLSELECTED(DimDate[YearMonthKey]), ORDERBY(DimDate[YearMonthKey], ASC)))"
  },
  {
    id: "win-window",
    category: "Modern window functions",
    functionName: "WINDOW",
    status: "Practised",
    syntax: "WINDOW(<from>, <from_type>, <to>, <to_type>[, <relation>][, <orderBy>][, <blanks>][, <partitionBy>])",
    parameter: "from, to, boundary types, relation, orderBy",
    parameterAccepts: "from/to integer bounds, REL/ABS types, table partition",
    whatItDoes: "Returns a window of rows within a partition defined by relative or absolute start and end boundaries.",
    example: "Moving 3M Sales = CALCULATE([Total Sales], WINDOW(-2, REL, 0, REL, ALLSELECTED(DimDate[Date]), ORDERBY(DimDate[Date], ASC)))"
  },
  {
    id: "win-orderby",
    category: "Modern window functions",
    functionName: "ORDERBY",
    status: "Practised",
    syntax: "ORDERBY(<expression>[, <direction>][, ...])",
    parameter: "expression, direction",
    parameterAccepts: "Column or measure, ASC / DESC",
    whatItDoes: "Defines the sorting order of rows inside modern DAX window functions (INDEX, OFFSET, WINDOW).",
    example: "ORDERBY(DimDate[YearMonthKey], ASC)"
  },
  {
    id: "win-partitionby",
    category: "Modern window functions",
    functionName: "PARTITIONBY",
    status: "Practised",
    syntax: "PARTITIONBY(<column>[, <column>...])",
    parameter: "columns",
    parameterAccepts: "Grouping columns for window partitioning",
    whatItDoes: "Partitions the dataset into distinct subsets inside modern window functions so ranks or offsets reset per group.",
    example: "PARTITIONBY(DimGeography[Region])"
  },
  {
    id: "win-matchby",
    category: "Modern window functions",
    functionName: "MATCHBY",
    status: "Practised",
    syntax: "MATCHBY(<column>[, <column>...])",
    parameter: "columns",
    parameterAccepts: "Key columns establishing current row identity",
    whatItDoes: "Defines the column(s) used to match the current row data with the relation in window functions.",
    example: "MATCHBY(DimDate[Date])"
  },
  {
    id: "concept-window-boundaries-rel",
    category: "Modern window functions",
    functionName: "Window boundaries using REL",
    status: "Practised",
    syntax: "WINDOW(-2, REL, 0, REL, ...)",
    parameter: "Relative boundaries (REL)",
    parameterAccepts: "Integer offset relative to current row",
    whatItDoes: "DAX Concept: Using relative boundaries in WINDOW (e.g. -2 REL to 0 REL) to calculate moving 3-period metrics.",
    example: "CALCULATE(AVERAGEX(ALLSELECTED(DimDate[MonthYear]), [Total Sales]), WINDOW(-2, REL, 0, REL, ALLSELECTED(DimDate[MonthYear]), ORDERBY(DimDate[MonthYear], ASC)))"
  },
  {
    id: "pattern-partitioning-by-region",
    category: "Modern window functions",
    functionName: "Partitioning calculations by Region",
    status: "Practised",
    syntax: "PARTITIONBY(DimGeography[Region]) in window queries",
    parameter: "Regional partition boundary",
    parameterAccepts: "Regional attribute column",
    whatItDoes: "DAX Pattern: Calculating independent ranks or offsets per geographic region without cross-contamination.",
    example: "CALCULATE([Total Sales], INDEX(1, ALLSELECTED(DimGeography[Region], DimCustomer[CustomerKey]), ORDERBY([Total Sales], DESC), PARTITIONBY(DimGeography[Region])))"
  },
  {
    id: "concept-matching-window-grain",
    category: "Modern window functions",
    functionName: "Matching window rows at the correct grain",
    status: "Practised",
    syntax: "MATCHBY / Grain Alignment in Window Relations",
    parameter: "Exact relation granularity",
    parameterAccepts: "Primary key columns matching visual grain",
    whatItDoes: "DAX Concept: Ensuring the relation in INDEX/OFFSET has identical grain to visual coordinates to prevent ambiguous context.",
    example: "SUMMARIZE(ALLSELECTED(FactSales), DimDate[YearMonthKey], DimCustomer[Region])"
  },
  {
    id: "pattern-offset-prev-month-sales",
    category: "Modern window functions",
    functionName: "Previous-month sales using OFFSET",
    status: "Practised",
    syntax: "CALCULATE([Total Sales], OFFSET(-1, ALLSELECTED(DimDate[MonthKey]), ORDERBY(DimDate[MonthKey], ASC)))",
    parameter: "Sequential month shift",
    parameterAccepts: "Contiguous chronological table",
    whatItDoes: "DAX Pattern: Clean, high-performance previous month calculation that does not rely on standard time intelligence.",
    example: "VAR PrevMonth = CALCULATE([Total Sales], OFFSET(-1, ALLSELECTED(DimDate[YearMonthKey]), ORDERBY(DimDate[YearMonthKey], ASC))) RETURN [Total Sales] - PrevMonth"
  },
  {
    id: "pattern-window-rolling-averages",
    category: "Modern window functions",
    functionName: "Rolling averages and historical comparisons using WINDOW",
    status: "Practised",
    syntax: "WINDOW(-11, REL, 0, REL, ALLSELECTED(DimDate[YearMonthKey]), ORDERBY(DimDate[YearMonthKey], ASC))",
    parameter: "Dynamic 12-month window",
    parameterAccepts: "Ordered date dimension",
    whatItDoes: "DAX Pattern: Computes running 12-month moving totals and averages using the modern WINDOW function.",
    example: "Rolling 12M = CALCULATE([Total Sales], WINDOW(-11, REL, 0, REL, ALLSELECTED(DimDate[YearMonthKey]), ORDERBY(DimDate[YearMonthKey], ASC)))"
  },

  // ==========================================
  // 7. Business-analysis patterns
  // ==========================================
  {
    id: "pattern-pct-of-total",
    category: "Business-analysis patterns",
    functionName: "Total sales and percentage of total",
    status: "Practised",
    syntax: "DIVIDE([Total Sales], CALCULATE([Total Sales], ALLSELECTED(DimProduct)))",
    parameter: "Base measure & AllSelected denominator",
    parameterAccepts: "Scalar measure and dimension table",
    whatItDoes: "DAX Pattern: Computes category or item share as a percentage of total visual sales.",
    example: "% Share = DIVIDE([Total Sales], CALCULATE([Total Sales], ALLSELECTED(DimProduct[Category])))"
  },
  {
    id: "pattern-dynamic-ranking",
    category: "Business-analysis patterns",
    functionName: "Dynamic ranking",
    status: "Practised",
    syntax: "RANKX(ALLSELECTED(DimProduct[ProductName]), [Total Sales], , DESC, Dense)",
    parameter: "Dynamic peer table & measure",
    parameterAccepts: "Dimension column and evaluation metric",
    whatItDoes: "DAX Pattern: Dynamically ranks products or customers based on current filter selections and slicers.",
    example: "Product Rank = IF(ISINSCOPE(DimProduct[ProductName]), RANKX(ALLSELECTED(DimProduct[ProductName]), [Total Sales], , DESC, Dense))"
  },
  {
    id: "pattern-topn-analysis",
    category: "Business-analysis patterns",
    functionName: "Top N analysis",
    status: "Practised",
    syntax: "CALCULATE([Total Sales], TOPN(10, ALLSELECTED(DimCustomer[CustomerKey]), [Total Sales], DESC))",
    parameter: "N count & ordering measure",
    parameterAccepts: "Integer threshold and sorting measure",
    whatItDoes: "DAX Pattern: Filters and aggregates sales strictly for the top N performers.",
    example: "Top 10 Customers Sales = CALCULATE([Total Sales], TOPN(10, VALUES(DimCustomer[CustomerKey]), [Total Sales], DESC))"
  },
  {
    id: "pattern-topn-pct-of-total",
    category: "Business-analysis patterns",
    functionName: "Top N percentage of total",
    status: "Practised",
    syntax: "DIVIDE([Top N Sales], [Total Sales])",
    parameter: "Top N measure / Total measure",
    parameterAccepts: "Derived measures",
    whatItDoes: "DAX Pattern: Calculates what percentage of company revenue is generated by the Top N accounts.",
    example: "VAR Top10Sales = CALCULATE([Total Sales], TOPN(10, VALUES(DimCustomer[CustomerKey]), [Total Sales], DESC)) RETURN DIVIDE(Top10Sales, [Total Sales])"
  },
  {
    id: "pattern-running-totals",
    category: "Business-analysis patterns",
    functionName: "Running totals",
    status: "Practised",
    syntax: "CALCULATE([Total Sales], FILTER(ALL(DimDate[Date]), DimDate[Date] <= MAX(DimDate[Date])))",
    parameter: "Cumulative date boundary",
    parameterAccepts: "Date dimension filter",
    whatItDoes: "DAX Pattern: Computes a cumulative running total from inception or year start up to the current row's date.",
    example: "Cumulative Sales = CALCULATE([Total Sales], FILTER(ALLSELECTED(DimDate[Date]), DimDate[Date] <= MAX(DimDate[Date])))"
  },
  {
    id: "pattern-pareto-analysis",
    category: "Business-analysis patterns",
    functionName: "Pareto analysis",
    status: "Practised",
    syntax: "Cumulative Top % calculation (80/20 rule)",
    parameter: "Cumulative rank / total",
    parameterAccepts: "Ranked entities and total population",
    whatItDoes: "DAX Pattern: Identifies the vital 20% of products or customers that generate 80% of total revenue.",
    example: "VAR RunningCustSales = CALCULATE([Total Sales], FILTER(ALLSELECTED(DimCustomer[CustomerKey]), [Total Sales] >= [CurrentCustSales])) RETURN DIVIDE(RunningCustSales, [Total Sales])"
  },
  {
    id: "pattern-abc-classification",
    category: "Business-analysis patterns",
    functionName: "ABC product classification",
    status: "Practised",
    syntax: "SWITCH(TRUE(), [Cumulative %] <= 0.70, \"A\", [Cumulative %] <= 0.90, \"B\", \"C\")",
    parameter: "Cumulative revenue thresholds",
    parameterAccepts: "Cumulative percentage measure",
    whatItDoes: "DAX Pattern: Categorizes products into Class A (top 70%), Class B (next 20%), and Class C (bottom 10%).",
    example: "VAR CumPct = [Pareto Cumulative %] RETURN SWITCH(TRUE(), CumPct <= 0.7, \"A\", CumPct <= 0.9, \"B\", \"C\")"
  },
  {
    id: "pattern-customer-segmentation",
    category: "Business-analysis patterns",
    functionName: "Customer segmentation",
    status: "Practised",
    syntax: "SWITCH(TRUE(), [Cust Sales] > 50000, \"Platinum\", [Cust Sales] > 20000, \"Gold\", \"Silver\")",
    parameter: "Customer value brackets",
    parameterAccepts: "Customer lifetime or annual spend",
    whatItDoes: "DAX Pattern: Segments customer accounts into spend tiers based on order volume or profitability.",
    example: "Customer Tier = SWITCH(TRUE(), [Total Sales] > 100000, \"Platinum\", [Total Sales] > 25000, \"Gold\", \"Silver\")"
  },
  {
    id: "pattern-dynamic-segmentation-disconnected",
    category: "Business-analysis patterns",
    functionName: "Dynamic segmentation with a disconnected table",
    status: "Practised",
    syntax: "FILTER(Segments, [CustSales] >= Segments[Min] && [CustSales] < Segments[Max])",
    parameter: "Disconnected configuration table",
    parameterAccepts: "Min/Max threshold columns",
    whatItDoes: "DAX Pattern: Uses a standalone configuration table (disconnected from model) to dynamically segment customers without hardcoding.",
    example: "Segment Customers = COUNTROWS(FILTER(VALUES(DimCustomer[CustomerKey]), VAR S = [Total Sales] RETURN S >= MIN(SpendTiers[Min]) && S < MAX(SpendTiers[Max])))"
  },
  {
    id: "pattern-visual-totals-allselected",
    category: "Business-analysis patterns",
    functionName: "Visual totals with ALLSELECTED",
    status: "Practised",
    syntax: "CALCULATE([Total Sales], ALLSELECTED())",
    parameter: "Visual coordinates reset",
    parameterAccepts: "Current visual context",
    whatItDoes: "DAX Pattern: Ensures card widgets or matrix denominators reflect the total of the visible rows in the visual.",
    example: "Visual Total Sales = CALCULATE([Total Sales], ALLSELECTED())"
  },
  {
    id: "pattern-first-purchase-date",
    category: "Business-analysis patterns",
    functionName: "First purchase date per customer",
    status: "Practised",
    syntax: "CALCULATE(MIN(FactSales[OrderDate]), ALLEXCEPT(FactSales, FactSales[CustomerKey]))",
    parameter: "Customer acquisition anchor",
    parameterAccepts: "Fact table customer foreign key",
    whatItDoes: "DAX Pattern: Determines the earliest order date in history for each customer across the entire dataset.",
    example: "First Purchase = CALCULATE(MIN(FactSales[OrderDate]), ALLEXCEPT(FactSales, FactSales[CustomerKey]))"
  },
  {
    id: "pattern-new-vs-returning-customers",
    category: "Business-analysis patterns",
    functionName: "New vs. returning customers",
    status: "Practised",
    syntax: "IF([First Purchase Date] in current period, \"New\", \"Returning\")",
    parameter: "Customer order timing comparison",
    parameterAccepts: "Current period date range vs first purchase",
    whatItDoes: "DAX Pattern: Distinguishes between newly acquired customers and existing retained customers in any calendar period.",
    example: "New Customers = VAR MinD = MIN(DimDate[Date]) VAR MaxD = MAX(DimDate[Date]) RETURN COUNTROWS(FILTER(VALUES(DimCustomer[CustomerKey]), [First Purchase Date] >= MinD && [First Purchase Date] <= MaxD))"
  },
  {
    id: "pattern-returning-customer-revenue-share",
    category: "Business-analysis patterns",
    functionName: "Returning-customer revenue and revenue share",
    status: "Practised",
    syntax: "CALCULATE([Total Sales], FILTER(DimCustomer, [First Purchase Date] < MIN(DimDate[Date])))",
    parameter: "Repeat customer revenue",
    parameterAccepts: "Customer cohort filter",
    whatItDoes: "DAX Pattern: Quantifies total revenue produced exclusively by returning customers and their share of gross sales.",
    example: "Returning Customer Share = VAR RetSales = CALCULATE([Total Sales], FILTER(VALUES(DimCustomer[CustomerKey]), [First Purchase Date] < MIN(DimDate[Date]))) RETURN DIVIDE(RetSales, [Total Sales])"
  },
  {
    id: "pattern-avg-revenue-per-returning-customer",
    category: "Business-analysis patterns",
    functionName: "Average revenue per returning customer",
    status: "Practised",
    syntax: "DIVIDE([Returning Customer Sales], [Returning Customer Count])",
    parameter: "Returning customer metrics",
    parameterAccepts: "Revenue and customer distinct count",
    whatItDoes: "DAX Pattern: Measures average spend per returning buyer to analyze customer lifetime value and retention quality.",
    example: "Avg Returning Spend = DIVIDE([Returning Customer Sales], [Returning Customer Count], 0)"
  },
  {
    id: "pattern-mom-growth-handling-totals",
    category: "Business-analysis patterns",
    functionName: "MoM sales-growth measures and handling totals",
    status: "Practised",
    syntax: "IF(HASONEVALUE(DimDate[MonthYear]), [MoM Growth %], [Overall Growth %])",
    parameter: "Matrix total row condition",
    parameterAccepts: "HASONEVALUE or ISINSCOPE check",
    whatItDoes: "DAX Pattern: Prevents nonsensical growth percentages in matrix grand total rows by detecting hierarchy scope.",
    example: "Safe MoM Growth = IF(ISINSCOPE(DimDate[MonthYear]), [MoM Sales Growth %], BLANK())"
  },
  {
    id: "pattern-customer-concentration-top3",
    category: "Business-analysis patterns",
    functionName: "Customer concentration — dynamic Top 3 by month",
    status: "Partial / parked",
    syntax: "DIVIDE(CALCULATE([Total Sales], TOPN(3, VALUES(DimCustomer[CustomerKey]), [Total Sales], DESC)), [Total Sales])",
    parameter: "Top 3 customer revenue share per month",
    parameterAccepts: "Monthly grain and top 3 customer sub-filter",
    whatItDoes: "DAX Pattern (Parked): Measures revenue dependency on top 3 clients month-by-month; parked on monthly tie handling.",
    example: "Top 3 Concentration = VAR Top3 = CALCULATE([Total Sales], TOPN(3, VALUES(DimCustomer[CustomerKey]), [Total Sales], DESC)) RETURN DIVIDE(Top3, [Total Sales])"
  },
  {
    id: "pattern-cohort-first-purchase",
    category: "Business-analysis patterns",
    functionName: "Cohort analysis — first purchase and cohort month",
    status: "Practised",
    syntax: "EOMONTH([First Purchase Date], 0)",
    parameter: "Cohort acquisition month tag",
    parameterAccepts: "Customer earliest date",
    whatItDoes: "DAX Pattern: Groups customers into cohorts based on the month they completed their first transaction.",
    example: "Customer Cohort Month = CALCULATE(EOMONTH(MIN(FactSales[OrderDate]), 0), ALLEXCEPT(FactSales, FactSales[CustomerKey]))"
  },
  {
    id: "pattern-cohort-size-retention",
    category: "Business-analysis patterns",
    functionName: "Cohort size and retention percentage",
    status: "Practised",
    syntax: "DIVIDE([Active Customers in Month N], [Cohort Initial Size])",
    parameter: "Cohort retention rate",
    parameterAccepts: "Cohort size and active returning customers",
    whatItDoes: "DAX Pattern: Tracks the percentage of an acquisition cohort that continues to make purchases across subsequent months.",
    example: "Cohort Retention % = VAR CohortSize = CALCULATE(DISTINCTCOUNT(FactSales[CustomerKey]), ALL(DimDate)) RETURN DIVIDE([Active In Period], CohortSize)"
  },
  {
    id: "pattern-cohort-month-offset",
    category: "Business-analysis patterns",
    functionName: "Cohort month-offset calculation",
    status: "Partial / parked",
    syntax: "(YEAR(OrderDate) - YEAR(CohortDate)) * 12 + MONTH(OrderDate) - MONTH(CohortDate)",
    parameter: "Month offset integer (0, 1, 2...)",
    parameterAccepts: "Calendar math between order and cohort",
    whatItDoes: "DAX Pattern (Parked): Calculates the month index (Month 0, Month 1, Month 2...) for cohort retention triangle visuals.",
    example: "Month Offset = VAR CohortDate = [Cohort Month] VAR ActiveDate = MIN(DimDate[Date]) RETURN (YEAR(ActiveDate) - YEAR(CohortDate)) * 12 + (MONTH(ActiveDate) - MONTH(CohortDate))"
  },

  // ==========================================
  // 8. Advanced and specialist functions
  // ==========================================
  {
    id: "adv-selectedmeasure",
    category: "Advanced and specialist functions",
    functionName: "SELECTEDMEASURE",
    status: "Practised",
    syntax: "SELECTEDMEASURE()",
    parameter: "None",
    parameterAccepts: "Calculation Group context",
    whatItDoes: "Used exclusively in Calculation Groups to reference whichever explicit measure is in current evaluation scope.",
    example: "Prior Year Calc Item = CALCULATE(SELECTEDMEASURE(), SAMEPERIODLASTYEAR(DimDate[Date]))"
  },
  {
    id: "adv-selectedmeasurename",
    category: "Advanced and specialist functions",
    functionName: "SELECTEDMEASURENAME",
    status: "Practised",
    syntax: "SELECTEDMEASURENAME()",
    parameter: "None",
    parameterAccepts: "Calculation Group context",
    whatItDoes: "Returns the string name of the measure currently evaluated in a calculation group item.",
    example: "Exclude Cost = IF(SELECTEDMEASURENAME() = \"Total Cost\", BLANK(), SELECTEDMEASURE())"
  },
  {
    id: "adv-isselectedmeasure",
    category: "Advanced and specialist functions",
    functionName: "ISSELECTEDMEASURE",
    status: "Practised",
    syntax: "ISSELECTEDMEASURE(<measure1>[, <measure2>...])",
    parameter: "measure references",
    parameterAccepts: "Explicit measures",
    whatItDoes: "Returns TRUE if the measure being evaluated by a calculation item is among the specified measures.",
    example: "Apply Mark-up = IF(ISSELECTEDMEASURE([Total Sales], [Total Margin]), SELECTEDMEASURE() * 1.1, SELECTEDMEASURE())"
  },
  {
    id: "adv-dynamic-format-strings",
    category: "Advanced and specialist functions",
    functionName: "Dynamic format strings",
    status: "Practised",
    syntax: "Calculation Item Format String Expression",
    parameter: "Format string logic",
    parameterAccepts: "Text format string expression",
    whatItDoes: "Dynamically alters number formatting (e.g., switches currency to % or adds 'K/M' suffixes) based on context.",
    example: "Dynamic Format = IF(ISSELECTEDMEASURE([Margin Pct]), \"0.0%\", \"$#,##0\")"
  },
  {
    id: "adv-path",
    category: "Advanced and specialist functions",
    functionName: "PATH",
    status: "Practised",
    syntax: "PATH(<ID_columnName>, <parent_columnName>)",
    parameter: "ID, parentID",
    parameterAccepts: "Key columns in parent-child hierarchy",
    whatItDoes: "Returns a pipe-delimited string representing the ancestry path from root to current item in parent-child hierarchy.",
    example: "Employee Hierarchy Path = PATH(DimEmployee[EmployeeKey], DimEmployee[ParentEmployeeKey])"
  },
  {
    id: "adv-pathitem",
    category: "Advanced and specialist functions",
    functionName: "PATHITEM",
    status: "Practised",
    syntax: "PATHITEM(<path>, <position>[, <type>])",
    parameter: "path, position, type",
    parameterAccepts: "Path string, integer level, TEXT/INTEGER",
    whatItDoes: "Returns the item at specified level position from a path string generated by PATH function.",
    example: "Top Manager = PATHITEM(DimEmployee[EmployeeHierarchyPath], 1, TEXT)"
  },
  {
    id: "adv-pathlength",
    category: "Advanced and specialist functions",
    functionName: "PATHLENGTH",
    status: "Practised",
    syntax: "PATHLENGTH(<path>)",
    parameter: "path",
    parameterAccepts: "Path string",
    whatItDoes: "Returns the number of levels/items in an ancestry path string (hierarchy depth).",
    example: "Hierarchy Depth = PATHLENGTH(DimEmployee[EmployeeHierarchyPath])"
  },
  {
    id: "adv-pathcontains",
    category: "Advanced and specialist functions",
    functionName: "PATHCONTAINS",
    status: "Practised",
    syntax: "PATHCONTAINS(<path>, <item>)",
    parameter: "path, item",
    parameterAccepts: "Path string, search key",
    whatItDoes: "Returns TRUE if the specified item exists anywhere within the delimited ancestry path.",
    example: "Is In Org Tree = PATHCONTAINS(DimEmployee[EmployeeHierarchyPath], \"105\")"
  },
  {
    id: "adv-userprincipalname",
    category: "Advanced and specialist functions",
    functionName: "USERPRINCIPALNAME",
    status: "Introduced",
    syntax: "USERPRINCIPALNAME()",
    parameter: "None",
    parameterAccepts: "RLS session context",
    whatItDoes: "Returns the Power BI Service logged-in user email (UPN) for Dynamic Row-Level Security (RLS).",
    example: "RLS Filter = DimSecurity[UserEmail] = USERPRINCIPALNAME()"
  },
  {
    id: "adv-username",
    category: "Advanced and specialist functions",
    functionName: "USERNAME",
    status: "Introduced",
    syntax: "USERNAME()",
    parameter: "None",
    parameterAccepts: "RLS session context",
    whatItDoes: "Returns the domain and username in Power BI Desktop (DOMAIN\\User) or UPN in Power BI Service.",
    example: "Windows User = DimEmployee[WindowsLogin] = USERNAME()"
  },
  {
    id: "adv-customdata",
    category: "Advanced and specialist functions",
    functionName: "CUSTOMDATA",
    status: "Introduced",
    syntax: "CUSTOMDATA()",
    parameter: "None",
    parameterAccepts: "Connection string CustomData property",
    whatItDoes: "Returns the string value passed in the CustomData connection property for embedded multi-tenant RLS.",
    example: "Tenant Filter = DimTenant[TenantID] = CUSTOMDATA()"
  },
  {
    id: "adv-info-tables",
    category: "Advanced and specialist functions",
    functionName: "INFO.TABLES",
    status: "Introduced",
    syntax: "INFO.TABLES()",
    parameter: "None",
    parameterAccepts: "DMV engine schema query",
    whatItDoes: "DAX DMV function that returns a table of model metadata describing all tables in the tabular model.",
    example: "Total Tables In Model = COUNTROWS(INFO.TABLES())"
  },
  {
    id: "adv-info-measures",
    category: "Advanced and specialist functions",
    functionName: "INFO.MEASURES",
    status: "Introduced",
    syntax: "INFO.MEASURES()",
    parameter: "None",
    parameterAccepts: "DMV engine schema query",
    whatItDoes: "DAX DMV function that returns metadata of all explicit measures, formulas, and format strings in the model.",
    example: "Documented Measures = FILTER(INFO.MEASURES(), [TableID] = 2)"
  }
];
