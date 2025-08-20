/*
  # Add outstanding column to customers table

  1. Changes
    - Add `outstanding` column to `customers` table with default value 0
    - This column tracks the amount customers owe to the business
    - Uses numeric(10,2) type for monetary values with 2 decimal places

  2. Security
    - No changes to existing RLS policies needed
    - Column inherits existing table permissions
*/

-- Add outstanding column to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'outstanding'
  ) THEN
    ALTER TABLE customers ADD COLUMN outstanding numeric(10,2) DEFAULT 0.00 NOT NULL;
  END IF;
END $$;

-- Add comment to explain the column
COMMENT ON COLUMN customers.outstanding IS 'Amount customer owes to the business (positive = customer owes money)';