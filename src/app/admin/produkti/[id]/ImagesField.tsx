"use client";

import { useState } from "react";
import { createImageUpload } from "../../actions";
import type { ProductFormValues } from "@/lib/catalog-input";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGES, isImageType } from "@/lib/product-images";
import a from "../../admin.module.scss";

type Image = ProductFormValues["images"][number];

type Props = {
  productId: string;
  productName: string;
  images: Image[];
  onChange: (images: Image[]) => void;
  /** Field errors from the last save, keyed like "images.0.alt". */
  error: (key: string) => string | undefined;
};

/**
 * Upload goes browser → S3 directly (presigned URL); the image only becomes part of the
 * product when the form is saved. The first image is the main one on cards and in search.
 */
export function ImagesField({ productId, productName, images, onChange, error }: Props) {
  const [uploading, setUploading] = useState(0);
  const [problem, setProblem] = useState("");

  const move = (from: number, to: number) => {
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  async function upload(files: FileList) {
    setProblem("");
    const room = MAX_IMAGES - images.length;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    if (files.length > picked.length) setProblem(`Ne vairāk kā ${MAX_IMAGES} attēli vienam produktam.`);

    const added: Image[] = [];
    setUploading(picked.length);
    for (const file of picked) {
      try {
        if (!isImageType(file.type)) throw new Error(`${file.name}: atļauti tikai JPEG, PNG vai WebP.`);
        if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name}: lielāks par ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`);
        const upload = await createImageUpload(productId, file.type, file.size);
        if ("error" in upload) throw new Error(`${file.name}: ${upload.error}`);
        const res = await fetch(upload.uploadUrl, { method: "PUT", body: file, headers: upload.headers });
        if (!res.ok) throw new Error(`${file.name}: augšupielāde neizdevās (${res.status}).`);
        added.push({ url: upload.url, alt: productName });
      } catch (e) {
        setProblem(e instanceof Error ? e.message : "Augšupielāde neizdevās.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (added.length) onChange([...images, ...added]);
  }

  return (
    <section className={a.section}>
      <h2>Attēli</h2>
      <span className={a.hint}>
        Pirmais attēls ir galvenais. JPEG, PNG vai WebP līdz {MAX_IMAGE_BYTES / 1024 / 1024} MB; ieteicams kvadrātveida,
        vismaz 1200 px. Izmaiņas stājas spēkā pēc „Saglabāt”.
      </span>

      <ul className={a.imageList}>
        {images.map((img, i) => (
          <li key={img.url} className={a.imageItem}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" />
            <div className={a.imageMeta}>
              <label className={a.field}>
                <span>{i === 0 ? "Galvenais attēls · apraksts (alt)" : "Apraksts (alt)"}</span>
                <input
                  className={error(`images.${i}.alt`) ? `${a.input} ${a.invalid}` : a.input}
                  value={img.alt}
                  onChange={(e) => onChange(images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
                />
                {error(`images.${i}.alt`) && <span className={a.error}>{error(`images.${i}.alt`)}</span>}
              </label>
              <div className={a.imageButtons}>
                <button type="button" className={a.linkButton} disabled={i === 0} onClick={() => move(i, i - 1)}>
                  ← Pa kreisi
                </button>
                <button type="button" className={a.linkButton} disabled={i === images.length - 1} onClick={() => move(i, i + 1)}>
                  Pa labi →
                </button>
                {i > 0 && (
                  <button type="button" className={a.linkButton} onClick={() => move(i, 0)}>
                    Padarīt par galveno
                  </button>
                )}
                <button
                  type="button"
                  className={a.linkButton}
                  onClick={() => onChange(images.filter((_, j) => j !== i))}
                >
                  Noņemt
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {error("images") && <span className={a.error}>{error("images")}</span>}
      {problem && <span className={a.error}>{problem}</span>}

      <label className={a.buttonSecondary} aria-disabled={uploading > 0 || images.length >= MAX_IMAGES}>
        {uploading > 0 ? `Augšupielādē… (${uploading})` : "+ Pievienot attēlus"}
        <input
          type="file"
          accept={Object.keys(IMAGE_TYPES).join(",")}
          multiple
          hidden
          disabled={uploading > 0 || images.length >= MAX_IMAGES}
          onChange={(e) => {
            if (e.target.files?.length) void upload(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
    </section>
  );
}
