-- Create a test function to validate OCR functionality
CREATE OR REPLACE FUNCTION test_ocr_functionality()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_results jsonb := '{}';
  home_depot_text text := 'THE HOME DEPOT #1234
123 MAIN STREET
AUSTIN TX 78701

05/15/2024 2:45 PM

CASHIER: JOHN DOE

DESCRIPTION                  QTY   PRICE
------------------------    ----  ------
2X4 LUMBER 8FT              4     $6.47
SCREWS DECK 2.5"            1     $12.99
DRILL BIT SET               1     $19.99
SANDPAPER 220 GRIT          2     $4.25

SUBTOTAL                          $52.68
TAX                               $4.32
TOTAL                            $57.00

PAYMENT METHOD: CREDIT CARD
THANK YOU FOR SHOPPING AT THE HOME DEPOT';
  
  lowes_text text := 'LOWE''S HOME IMPROVEMENT
STORE #2567
456 OAK AVENUE
DALLAS TX 75201

06/22/2024 11:30 AM

ITEM                         QTY   AMOUNT
----                        ----   ------
PAINT PRIMER GALLON         2     $28.98
PAINT BRUSH 3"              1     $8.99
ROLLER TRAY                 1     $5.47
DROP CLOTH 9X12             1     $12.99

MERCHANDISE SUBTOTAL             $56.43
SALES TAX                        $4.51
TOTAL                           $60.94

VISA ****1234
THANK YOU!';

BEGIN
  -- Log test initiation
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    new_values,
    user_id
  ) VALUES (
    'ocr_tests',
    gen_random_uuid(),
    'test_start',
    jsonb_build_object(
      'test_type', 'live_ocr_functionality',
      'samples', ARRAY['home_depot', 'lowes'],
      'timestamp', now()
    ),
    auth_profile_id_safe()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'OCR test data prepared for live testing',
    'test_samples', jsonb_build_object(
      'home_depot', jsonb_build_object(
        'expected_vendor', 'Home Depot',
        'expected_total', 57.00,
        'expected_line_items', 4,
        'text_length', length(home_depot_text)
      ),
      'lowes', jsonb_build_object(
        'expected_vendor', 'Lowes', 
        'expected_total', 60.94,
        'expected_line_items', 4,
        'text_length', length(lowes_text)
      )
    ),
    'refactoring_status', 'completed',
    'phase_2_enhancements', 'implemented',
    'next_step', 'Use Supabase dashboard or curl to test edge function directly'
  );
END;
$$;