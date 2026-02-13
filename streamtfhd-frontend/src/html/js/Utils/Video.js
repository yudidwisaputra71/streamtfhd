export class Video {
    static guessVideoMimeType(filename) {
        const ext = filename.split(".").pop()?.toLowerCase();

        switch (ext) {
            case "mp4":
            return "video/mp4";
            case "mov":
            return "video/quicktime";
            case "avi":
            return "video/x-msvideo";
            default:
            return null; // unsupported
        }
    }
}