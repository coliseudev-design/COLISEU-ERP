/// Diagnostic test: generates a minimal PDF with printpdf 0.7 to understand
/// the content stream operator ordering for text + images + polygons.
use printpdf::*;
use printpdf::path::{PaintMode, WindingOrder};
use std::fs::File;
use std::io::{BufWriter, Read};

#[test]
fn test_diagnostic_minimal_pdf() {
    // Create a minimal PDF with just a polygon, text, and observe the output
    let (doc, page1, layer1) = PdfDocument::new(
        "Diagnostic Test",
        Mm(210.0),
        Mm(297.0),
        "Layer 1",
    );

    let current_layer = doc.get_page(page1).get_layer(layer1);

    // 1. Draw a rectangle
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.9, None)));
    current_layer.set_outline_color(Color::Greyscale(Greyscale::new(0.0, None)));
    current_layer.set_outline_thickness(0.5);
    let points = vec![
        (Point::new(Mm(10.0), Mm(280.0)), false),
        (Point::new(Mm(200.0), Mm(280.0)), false),
        (Point::new(Mm(200.0), Mm(290.0)), false),
        (Point::new(Mm(10.0), Mm(290.0)), false),
    ];
    let polygon = Polygon {
        rings: vec![points],
        mode: PaintMode::FillStroke,
        winding_order: WindingOrder::NonZero,
    };
    current_layer.add_polygon(polygon);

    // 2. Add a builtin font
    let font = doc.add_builtin_font(BuiltinFont::Helvetica).unwrap();
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold).unwrap();

    // 3. Write text
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));
    current_layer.use_text("Hello World - Header Text", 12.0, Mm(50.0), Mm(284.0), &font_bold);

    // 4. Draw another rectangle below
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.95, None)));
    current_layer.set_outline_color(Color::Greyscale(Greyscale::new(0.0, None)));
    let points2 = vec![
        (Point::new(Mm(10.0), Mm(250.0)), false),
        (Point::new(Mm(200.0), Mm(250.0)), false),
        (Point::new(Mm(200.0), Mm(275.0)), false),
        (Point::new(Mm(10.0), Mm(275.0)), false),
    ];
    let polygon2 = Polygon {
        rings: vec![points2],
        mode: PaintMode::Stroke,
        winding_order: WindingOrder::NonZero,
    };
    current_layer.add_polygon(polygon2);

    // 5. More text inside the second box
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));
    current_layer.use_text("CHAVE DE ACESSO DA NFS-E", 8.0, Mm(15.0), Mm(270.0), &font_bold);
    current_layer.use_text("35260805766577000122100100000000011000000000123456", 9.0, Mm(15.0), Mm(264.0), &font);

    // 6. Draw a third box
    let points3 = vec![
        (Point::new(Mm(10.0), Mm(220.0)), false),
        (Point::new(Mm(200.0), Mm(220.0)), false),
        (Point::new(Mm(200.0), Mm(245.0)), false),
        (Point::new(Mm(10.0), Mm(245.0)), false),
    ];
    let polygon3 = Polygon {
        rings: vec![points3],
        mode: PaintMode::Stroke,
        winding_order: WindingOrder::NonZero,
    };
    current_layer.add_polygon(polygon3);

    current_layer.use_text("PRESTADOR / FORNECEDOR", 8.0, Mm(15.0), Mm(240.0), &font_bold);
    current_layer.use_text("CNPJ: 05.766.577/0001-22", 8.0, Mm(15.0), Mm(234.0), &font);
    current_layer.use_text("Piveta Distribuidora de Tintas Automotivas LTDA", 8.0, Mm(15.0), Mm(228.0), &font);

    // Save
    let temp_dir = std::env::temp_dir();
    let pdf_path = temp_dir.join("diagnostic_printpdf_danfse.pdf");
    
    let file = File::create(&pdf_path).unwrap();
    doc.save(&mut BufWriter::new(file)).unwrap();

    // Read the file size
    let metadata = std::fs::metadata(&pdf_path).unwrap();
    println!("PDF generated: {:?}", pdf_path);
    println!("PDF file size: {} bytes", metadata.len());
    assert!(metadata.len() > 500, "PDF file is too small");

    // Read the raw PDF bytes and look for text operators
    let mut raw = Vec::new();
    File::open(&pdf_path).unwrap().read_to_end(&mut raw).unwrap();
    let raw_str = String::from_utf8_lossy(&raw);

    // Check that the text content stream has BT/ET blocks
    let bt_count = raw_str.matches("BT").count();
    let et_count = raw_str.matches("ET").count();
    println!("BT count: {}, ET count: {}", bt_count, et_count);
    
    // Check for Tf (font selection) operators
    let tf_count = raw_str.matches(" Tf").count();
    println!("Tf (font) operators: {}", tf_count);
    
    // Check for Tj (show text) operators
    let tj_count = raw_str.matches(" Tj").count();
    println!("Tj (text) operators: {}", tj_count);

    // Assert that text IS present in the PDF
    assert!(bt_count > 0, "No BT operators found - text blocks missing from PDF");
    assert!(tf_count > 0, "No Tf operators found - fonts not referenced in PDF");

    // Open the PDF automatically for visual inspection
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("cmd")
            .args(["/C", "start", "", &pdf_path.to_string_lossy()])
            .spawn();
    }
}

#[test]
fn test_diagnostic_with_image() {
    // Test what happens when we add an image to the same layer as text
    let (doc, page1, layer1) = PdfDocument::new(
        "Diagnostic Image Test",
        Mm(210.0),
        Mm(297.0),
        "Layer 1",
    );

    let current_layer = doc.get_page(page1).get_layer(layer1);

    let font = doc.add_builtin_font(BuiltinFont::Helvetica).unwrap();
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold).unwrap();

    // Draw text first
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));
    current_layer.use_text("Text BEFORE image", 12.0, Mm(50.0), Mm(284.0), &font_bold);

    // Generate a tiny 100x100 black PNG in memory
    let mut png_data = Vec::new();
    {
        use printpdf::image_crate::{RgbaImage, Rgba};
        let img = RgbaImage::from_pixel(100, 100, Rgba([0u8, 0u8, 0u8, 255u8]));
        let mut cursor = std::io::Cursor::new(&mut png_data);
        img.write_to(&mut cursor, printpdf::image_crate::ImageFormat::Png).unwrap();
    }

    // Add the image
    if let Ok(dynamic_img) = printpdf::image_crate::load_from_memory(&png_data) {
        let pdf_image = Image::from_dynamic_image(&dynamic_img);
        pdf_image.add_to_layer(
            current_layer.clone(),
            ImageTransform {
                translate_x: Some(Mm(150.0)),
                translate_y: Some(Mm(270.0)),
                scale_x: Some(0.1),
                scale_y: Some(0.1),
                ..Default::default()
            },
        );
    }

    // Draw text AFTER image
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));
    current_layer.use_text("Text AFTER image", 12.0, Mm(50.0), Mm(260.0), &font);
    current_layer.use_text("This text should be visible too", 10.0, Mm(50.0), Mm(250.0), &font);

    // Save
    let temp_dir = std::env::temp_dir();
    let pdf_path = temp_dir.join("diagnostic_printpdf_image.pdf");
    
    let file = File::create(&pdf_path).unwrap();
    doc.save(&mut BufWriter::new(file)).unwrap();

    let metadata = std::fs::metadata(&pdf_path).unwrap();
    println!("Image PDF generated: {:?}", pdf_path);
    println!("Image PDF file size: {} bytes", metadata.len());
    assert!(metadata.len() > 500, "PDF file is too small");

    // Read raw content
    let mut raw = Vec::new();
    File::open(&pdf_path).unwrap().read_to_end(&mut raw).unwrap();
    let raw_str = String::from_utf8_lossy(&raw);

    let bt_count = raw_str.matches("BT").count();
    let et_count = raw_str.matches("ET").count();
    let do_count = raw_str.matches(" Do").count();
    println!("BT: {}, ET: {}, Do: {}", bt_count, et_count, do_count);

    // Open the PDF automatically for visual inspection
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("cmd")
            .args(["/C", "start", "", &pdf_path.to_string_lossy()])
            .spawn();
    }
}
