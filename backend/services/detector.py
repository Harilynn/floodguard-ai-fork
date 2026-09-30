import cv2
import torch
from ultralytics import YOLO


class DroneDetector:

    def __init__(
        self,
        model_path,
        tile_size=512,
        overlap=0.25,
        conf_threshold=0.50,
        nms_iou=0.40,
        min_box_width=8,
        min_box_height=12,
        min_box_area=80,
        min_aspect_ratio=0.40,
        max_aspect_ratio=3.50,
    ):
        """
        FloodGuard AI
        ----------------

        Person detection for aerial/flood images.

        Main goals:
        1. Detect small people.
        2. Reduce false detections on trees/bushes/poles.
        3. Remove duplicate detections caused by overlapping tiles.
        """

        # =====================================================
        # LOAD MODEL
        # =====================================================

        self.model = YOLO(model_path)
        torch.set_num_threads(1)

        # =====================================================
        # SETTINGS
        # =====================================================

        self.tile_size = tile_size
        self.overlap = overlap

        # IMPORTANT:
        # Increased from 0.35 to 0.50 because the model is
        # producing many low-confidence false positives.
        self.conf_threshold = conf_threshold

        self.nms_iou = nms_iou

        self.min_box_width = min_box_width
        self.min_box_height = min_box_height
        self.min_box_area = min_box_area

        self.min_aspect_ratio = min_aspect_ratio
        self.max_aspect_ratio = max_aspect_ratio

        # =====================================================
        # DEVICE
        # =====================================================

        if torch.cuda.is_available():
            self.device = 0
            device_name = "GPU"
        else:
            self.device = "cpu"
            device_name = "CPU"

        # =====================================================
        # STARTUP LOG
        # =====================================================

        print()
        print("=" * 60)
        print("          FLOODGUARD AI - DRONE DETECTOR")
        print("=" * 60)

        print("Model classes:", self.model.names)
        print("Device:", device_name)

        print(
            "Confidence threshold:",
            self.conf_threshold
        )

        print(
            "Tile size:",
            self.tile_size
        )

        print(
            "Tile overlap:",
            self.overlap
        )

        print(
            "NMS IoU:",
            self.nms_iou
        )

        print(
            "Minimum box:",
            f"{self.min_box_width} x "
            f"{self.min_box_height}"
        )

        print(
            "Minimum area:",
            self.min_box_area
        )

        print(
            "Aspect ratio:",
            f"{self.min_aspect_ratio} - "
            f"{self.max_aspect_ratio}"
        )

        print("=" * 60)
        print()

    # =========================================================
    # IOU
    # =========================================================

    def calculate_iou(self, box1, box2):

        x1 = max(
            box1[0],
            box2[0]
        )

        y1 = max(
            box1[1],
            box2[1]
        )

        x2 = min(
            box1[2],
            box2[2]
        )

        y2 = min(
            box1[3],
            box2[3]
        )

        intersection_width = max(
            0,
            x2 - x1
        )

        intersection_height = max(
            0,
            y2 - y1
        )

        intersection = (
            intersection_width
            * intersection_height
        )

        area1 = (
            max(
                0,
                box1[2] - box1[0]
            )
            *
            max(
                0,
                box1[3] - box1[1]
            )
        )

        area2 = (
            max(
                0,
                box2[2] - box2[0]
            )
            *
            max(
                0,
                box2[3] - box2[1]
            )
        )

        union = (
            area1
            + area2
            - intersection
        )

        if union <= 0:
            return 0.0

        return intersection / union

    # =========================================================
    # NMS
    # =========================================================

    def nms(self, detections):

        if not detections:
            return []

        detections = sorted(
            detections,
            key=lambda x: x[4],
            reverse=True
        )

        keep = []

        while detections:

            best = detections.pop(0)

            keep.append(best)

            remaining = []

            for detection in detections:

                iou = self.calculate_iou(
                    best,
                    detection
                )

                if iou < self.nms_iou:
                    remaining.append(detection)

            detections = remaining

        return keep

    # =========================================================
    # BOX VALIDATION
    # =========================================================

    def valid_person_box(
        self,
        x1,
        y1,
        x2,
        y2
    ):

        width = x2 - x1
        height = y2 - y1

        # -----------------------------------------------------
        # WIDTH
        # -----------------------------------------------------

        if width < self.min_box_width:
            return False

        # -----------------------------------------------------
        # HEIGHT
        # -----------------------------------------------------

        if height < self.min_box_height:
            return False

        # -----------------------------------------------------
        # AREA
        # -----------------------------------------------------

        area = width * height

        if area < self.min_box_area:
            return False

        # -----------------------------------------------------
        # ASPECT RATIO
        # -----------------------------------------------------

        if width <= 0:
            return False

        ratio = height / width

        if ratio < self.min_aspect_ratio:
            return False

        if ratio > self.max_aspect_ratio:
            return False

        return True

    # =========================================================
    # PREDICTION
    # =========================================================

    def predict(self, image):

        if image is None:
            raise ValueError(
                "Invalid image provided."
            )

        if not hasattr(image, "shape"):
            raise ValueError(
                "Invalid image."
            )

        # =====================================================
        # IMAGE SIZE
        # =====================================================

        height, width = image.shape[:2]

        print()
        print("=" * 60)
        print("Starting FloodGuard AI detection")
        print("=" * 60)

        print(
            "Image dimensions:",
            f"{width} x {height}"
        )

        # =====================================================
        # TILE STRIDE
        # =====================================================

        stride = int(
            self.tile_size
            * (1 - self.overlap)
        )

        print(
            "Tile size:",
            self.tile_size
        )

        print(
            "Overlap:",
            self.overlap
        )

        print(
            "Stride:",
            stride
        )

        # =====================================================
        # STORAGE
        # =====================================================

        detections = []

        tile_number = 0

        raw_detections = 0

        rejected_confidence = 0
        rejected_size = 0
        rejected_geometry = 0

        # =====================================================
        # TILE PROCESSING
        # =====================================================

        for y in range(
            0,
            height,
            stride
        ):

            for x in range(
                0,
                width,
                stride
            ):

                # -------------------------------------------------
                # TILE BOUNDARIES
                # -------------------------------------------------

                x2 = min(
                    x + self.tile_size,
                    width
                )

                y2 = min(
                    y + self.tile_size,
                    height
                )

                x1 = max(
                    0,
                    x2 - self.tile_size
                )

                y1 = max(
                    0,
                    y2 - self.tile_size
                )

                tile = image[
                    y1:y2,
                    x1:x2
                ]

                tile_number += 1

                # =================================================
                # YOLO
                # =================================================

                results = self.model.predict(
                    source=tile,

                    # Keep this slightly lower internally.
                    # We perform our own confidence filtering
                    # below.
                    conf=0.10,

                    imgsz=640,

                    device=self.device,

                    stream=True,

                    classes=[0],

                    verbose=False
                )

                result = next(iter(results), None)
                if result is None:
                    continue

                if result.boxes is None:
                    continue

                if len(result.boxes) == 0:
                    continue

                # =================================================
                # GET BOXES
                # =================================================

                boxes = (
                    result.boxes.xyxy
                    .cpu()
                    .numpy()
                )

                scores = (
                    result.boxes.conf
                    .cpu()
                    .numpy()
                )

                # =================================================
                # PROCESS
                # =================================================

                for box, score in zip(
                    boxes,
                    scores
                ):

                    raw_detections += 1

                    score = float(score)

                    # =================================================
                    # CONFIDENCE FILTER
                    # =================================================

                    if score < self.conf_threshold:

                        rejected_confidence += 1

                        continue

                    # =================================================
                    # TILE COORDINATES
                    # =================================================

                    bx1, by1, bx2, by2 = box

                    # =================================================
                    # SIZE FILTER
                    # =================================================

                    if not self.valid_person_box(
                        bx1,
                        by1,
                        bx2,
                        by2
                    ):

                        width_box = bx2 - bx1
                        height_box = by2 - by1

                        area = (
                            width_box
                            * height_box
                        )

                        if (
                            width_box
                            <
                            self.min_box_width
                            or
                            height_box
                            <
                            self.min_box_height
                            or
                            area
                            <
                            self.min_box_area
                        ):

                            rejected_size += 1

                        else:

                            rejected_geometry += 1

                        continue

                    # =================================================
                    # CONVERT TILE → ORIGINAL IMAGE
                    # =================================================

                    bx1 += x1
                    bx2 += x1

                    by1 += y1
                    by2 += y1

                    # =================================================
                    # CLIP BOX
                    # =================================================

                    bx1 = max(
                        0,
                        min(
                            width - 1,
                            bx1
                        )
                    )

                    by1 = max(
                        0,
                        min(
                            height - 1,
                            by1
                        )
                    )

                    bx2 = max(
                        0,
                        min(
                            width - 1,
                            bx2
                        )
                    )

                    by2 = max(
                        0,
                        min(
                            height - 1,
                            by2
                        )
                    )

                    # =================================================
                    # FINAL VALIDATION
                    # =================================================

                    if bx2 <= bx1:
                        continue

                    if by2 <= by1:
                        continue

                    # =================================================
                    # STORE
                    # =================================================

                    detections.append([
                        float(bx1),
                        float(by1),
                        float(bx2),
                        float(by2),
                        score
                    ])

        # =====================================================
        # STATISTICS
        # =====================================================

        print()
        print("-" * 60)
        print("DETECTION STATISTICS")
        print("-" * 60)

        print(
            "Tiles processed:",
            tile_number
        )

        print(
            "YOLO raw detections:",
            raw_detections
        )

        print(
            "Rejected by confidence:",
            rejected_confidence
        )

        print(
            "Rejected by size:",
            rejected_size
        )

        print(
            "Rejected by geometry:",
            rejected_geometry
        )

        print(
            "Detections before NMS:",
            len(detections)
        )

        # =====================================================
        # NMS
        # =====================================================

        final_detections = self.nms(
            detections
        )

        # =====================================================
        # SORT
        # =====================================================

        final_detections = sorted(
            final_detections,
            key=lambda x: x[4],
            reverse=True
        )

        # =====================================================
        # FINAL OUTPUT
        # =====================================================

        print(
            "Final detections:",
            len(final_detections)
        )

        print()
        print("FINAL PERSON DETECTIONS")
        print("-" * 60)

        for i, detection in enumerate(
            final_detections,
            1
        ):

            x1, y1, x2, y2, confidence = detection

            print(
                f"Person {i}: "
                f"confidence={confidence:.3f} "
                f"box=("
                f"{int(x1)}, "
                f"{int(y1)}, "
                f"{int(x2)}, "
                f"{int(y2)}"
                f")"
            )

        print("-" * 60)

        # =====================================================
        # ANNOTATED IMAGE
        # =====================================================

        output = image.copy()

        for i, detection in enumerate(
            final_detections,
            1
        ):

            x1, y1, x2, y2, confidence = detection

            x1 = int(x1)
            y1 = int(y1)
            x2 = int(x2)
            y2 = int(y2)

            # -------------------------------------------------
            # BOX
            # -------------------------------------------------

            cv2.rectangle(
                output,
                (x1, y1),
                (x2, y2),
                (255, 0, 0),
                2
            )

            # -------------------------------------------------
            # LABEL
            # -------------------------------------------------

            label = (
                f"Person {i} "
                f"{confidence:.2f}"
            )

            (
                text_width,
                text_height
            ), baseline = cv2.getTextSize(
                label,
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                2
            )

            label_y = max(
                text_height + 5,
                y1
            )

            # -------------------------------------------------
            # LABEL BACKGROUND
            # -------------------------------------------------

            cv2.rectangle(
                output,
                (
                    x1,
                    label_y - text_height - 5
                ),
                (
                    x1 + text_width + 4,
                    label_y + baseline
                ),
                (255, 0, 0),
                -1
            )

            # -------------------------------------------------
            # LABEL TEXT
            # -------------------------------------------------

            cv2.putText(
                output,
                label,
                (
                    x1 + 2,
                    label_y
                ),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 255, 255),
                2,
                cv2.LINE_AA
            )

        # =====================================================
        # DONE
        # =====================================================

        print()
        print(
            "Detection completed successfully."
        )

        print(
            "People detected:",
            len(final_detections)
        )

        print("=" * 60)
        print()

        return (
            final_detections,
            output
        )