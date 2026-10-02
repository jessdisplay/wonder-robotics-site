import Foundation
import Vision
import AppKit
for path in CommandLine.arguments.dropFirst() {
    guard let img = NSImage(contentsOfFile: path), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { print("\(path) unreadable"); continue }
    let req = VNDetectFaceRectanglesRequest()
    try? VNImageRequestHandler(cgImage: cg, options: [:]).perform([req])
    let f = (req.results ?? []).max(by: { $0.boundingBox.width < $1.boundingBox.width })
    if let b = f?.boundingBox {
        // Vision's origin is bottom-left; report x, top, w, h as fractions from the top-left
        print("\(path) \(b.minX) \(1 - b.maxY) \(b.width) \(b.height)")
    } else { print("\(path) none") }
}
