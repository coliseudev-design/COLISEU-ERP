pub mod model;
pub mod xml_parser;
pub mod ibge;
pub mod qrcode;
pub mod fonts;
pub mod assets;
pub mod watermark;
pub mod blocks;
pub mod renderer;

pub use model::*;
pub use renderer::render_danfse_pdf;
pub use xml_parser::parse_xml_to_danfse;
